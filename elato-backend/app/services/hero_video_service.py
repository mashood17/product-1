"""
Admin-managed hero background videos (desktop + mobile slots).

Validates -> transcodes to a compressed, web-delivery H.264 MP4 (via a
bundled static ffmpeg binary, see `_transcode_to_h264`) -> stores the
transcoded file in Supabase Storage -> probes duration/dimensions and
extracts a poster frame via PyAV (which bundles its own decoder libraries,
so no *separate* system ffmpeg install is required for that half).

The uploaded source is never stored as-is: admins can upload straight off a
phone/DSLR/screen-recording (whatever they have) without pre-compressing —
every upload is re-encoded to a small, quality-targeted MP4 before it ever
reaches Storage, so a heavy source file never becomes a heavy delivered file.

Everything here is disk-backed, not RAM-backed: the incoming upload is
stream-copied to a temp file (never held as one big `bytes` object), ffmpeg
reads/writes temp files directly, and the compressed result is uploaded to
Supabase straight from an open file handle. This matters on a memory-
constrained Render instance — see the module-level comment on
`_process_and_upload_hero_video` for the incident this was fixed after.

Deliberately structured so that changes: everything that inspects or
transforms the video goes through the `VideoProcessor` protocol below.
Swapping `_processor` for a different metadata/poster backend is the only
change needed there — the API routes, the DB schema, and the frontend all
already treat "one stored video + optional poster" as the contract and don't
need to change.
"""

from __future__ import annotations

import asyncio
import io
import logging
import subprocess
import tempfile
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator, Protocol

import imageio_ffmpeg
from fastapi import UploadFile

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.db import get_supabase
from app.repositories import hero_background_repository
from app.services import media_service

logger = logging.getLogger("elato.hero_video")


def _current_rss_kb() -> int | None:
    """Current process RSS in kB, read straight from `/proc/self/status`
    (the kernel's own live figure — what the OOM killer actually acts on),
    not `resource.getrusage().ru_maxrss` (a monotonic high-water mark that
    only ever grows and can't show memory being released). Linux-only by
    construction (`/proc` doesn't exist elsewhere); returns None off Linux —
    e.g. local Windows/macOS dev — so instrumentation degrades silently
    instead of breaking non-production runs. Render's containers are Linux,
    so this is live data in the environment that actually OOMs."""
    try:
        with open("/proc/self/status", "rb") as f:
            for line in f:
                if line.startswith(b"VmRSS:"):
                    return int(line.split()[1])  # kB, per /proc(5)
    except (OSError, IndexError, ValueError):
        return None
    return None


@contextmanager
def _timed_step(step: str, slot: str) -> Iterator[None]:
    """Logs how long one pipeline step took, so a slow upload can be
    diagnosed from the logs alone (which step, not just "it was slow").
    Also logs process RSS immediately before and after the step, and the
    delta between them, so a memory spike can be attributed to a specific
    step from production logs alone — this is what the Render OOM
    investigation (see `_process_and_upload_hero_video`'s docstring) needed
    but didn't have. Uses try/finally (not try/except) so both duration and
    RSS are logged whether the step succeeds *or* raises — a step that fails
    partway through is exactly the case worth measuring, not one to skip.
    Never alters control flow: any exception raised inside the `with` block
    propagates unchanged after logging."""
    start = time.perf_counter()
    rss_before = _current_rss_kb()
    try:
        yield
    finally:
        duration_ms = (time.perf_counter() - start) * 1000
        rss_after = _current_rss_kb()
        rss_delta = rss_after - rss_before if (rss_before is not None and rss_after is not None) else None
        logger.info(
            f"[hero_video_upload] slot={slot} step={step} duration_ms={duration_ms:.1f} "
            f"rss_before_kb={rss_before} rss_after_kb={rss_after} rss_delta_kb={rss_delta}"
        )


VIDEO_BUCKET = "hero-videos"
POSTER_BUCKET = "hero"
SLOTS = ("desktop", "mobile")

# Hero videos loop — anything longer is almost certainly the wrong file, not
# a legitimate hero clip.
_MAX_DURATION_SECONDS = 20
_MIN_DIMENSION = 480
_MAX_DIMENSION = 3840

# Delivery profile per slot — hero videos are decorative, always muted, and
# looped, so there is no reason to ship source resolution/bitrate. CRF
# (quality-targeted, not a fixed bitrate) means output size tracks actual
# scene complexity: a simple static shot compresses far below this, a busy
# one only spends bits where they're visible. "mobile" gets a lower cap and
# a slightly higher CRF on top of that, since it's already the
# smaller-by-design slot and is disproportionately likely to be on a
# constrained connection.
_COMPRESSION_PROFILES: dict[str, dict[str, int]] = {
    "desktop": {"max_dimension": 1920, "crf": 26},
    "mobile": {"max_dimension": 1080, "crf": 28},
}
# "medium" is ffmpeg's own default tradeoff point (slower presets buy a
# smaller file at the same CRF, at the cost of more CPU time) — appropriate
# for a <=20s clip encoded once at upload time, not per-request.
_ENCODE_PRESET = "medium"
_TRANSCODE_TIMEOUT_SECONDS = 180
# Fixed, small thread count rather than ffmpeg's auto-detected default. This
# is a memory fix, not just a CPU one: libx264 allocates per-thread frame/
# lookahead buffers, and on a cgroup-limited container (Render's smaller
# plans report a fractional CPU quota, e.g. 0.5) auto-detection can still see
# the *host's* full core count and size buffers for threads it will never
# get meaningful scheduling time on — paying the memory cost of parallelism
# the container can't actually use. 2 keeps that bounded while still being
# well within the 180s timeout for a <=20s clip.
#
# Applied on BOTH sides of the pipeline: an input-context `-threads` (before
# `-i`, bounds the *decoder*) and an output-context `-threads` (after `-c:v`,
# bounds the *encoder*) are two independent ffmpeg option groups — setting
# one does not set the other. A prior version of this constant only bounded
# the encoder; the decoder was left on ffmpeg's auto-detected thread count,
# and for admin-uploaded phone footage (source resolution up to
# `_MAX_DIMENSION`, i.e. up to 4K) frame-threaded decoding allocates one full
# decoded-frame buffer per thread — at 4K that's ~12MB/frame, so an
# auto-detected 8-16 threads is another 100-200MB the encoder-side fix never
# touched. That gap is the leading suspect for the Render OOM this constant's
# other half was already fixed for.
_ENCODE_THREADS = 2


@dataclass
class VideoProbe:
    width: int | None = None
    height: int | None = None
    duration_seconds: float | None = None
    poster_jpeg: bytes | None = None


class VideoProcessor(Protocol):
    def probe(self, path: str, *, include_poster: bool = True) -> VideoProbe: ...


class PyAvProbe:
    """Best-effort metadata + poster-frame extraction using PyAV, reading
    directly from a file path (never a `BytesIO`-wrapped in-memory copy —
    PyAV/libav can open a path natively, so there's no reason to duplicate
    the file into RAM just to hand it a stream). Any failure (library not
    installed, unsupported container, corrupt file) degrades to an empty
    probe rather than blocking the upload — duration/dimension checks are
    simply skipped, and the admin can upload a poster image manually via the
    fallback endpoint.

    `include_poster` lets a caller skip the decode-a-frame-and-JPEG-encode-it
    step when only metadata (width/height/duration) is needed. The pipeline
    probes twice — once on the *source* upload for validation, once on the
    *compressed* output for the poster that's actually stored — and only the
    second call's poster is ever used, so decoding one on the source call
    too was pure waste: on a large admin-uploaded source (up to
    `_MAX_DIMENSION`, i.e. up to 4K) that's a full-resolution frame decode +
    JPEG encode thrown away every single upload."""

    def probe(self, path: str, *, include_poster: bool = True) -> VideoProbe:
        try:
            import av
        except ImportError:
            return VideoProbe()

        try:
            container = av.open(path)
            try:
                stream = next((s for s in container.streams if s.type == "video"), None)
                if stream is None:
                    return VideoProbe()

                width, height = stream.width, stream.height

                duration_seconds: float | None = None
                if stream.duration and stream.time_base:
                    duration_seconds = float(stream.duration * stream.time_base)
                elif container.duration:
                    duration_seconds = container.duration / 1_000_000

                poster_jpeg = None
                if include_poster:
                    try:
                        for frame in container.decode(stream):
                            poster_jpeg = _frame_to_jpeg(frame)
                            break
                    except Exception:
                        poster_jpeg = None

                return VideoProbe(
                    width=width, height=height, duration_seconds=duration_seconds, poster_jpeg=poster_jpeg
                )
            finally:
                container.close()
        except Exception:
            return VideoProbe()


def _frame_to_jpeg(frame: Any) -> bytes:
    # A single decoded frame, re-encoded as a small JPEG — this one stays
    # in-memory. It's a few hundred KB at most, nowhere near the size that
    # made the raw video worth keeping off the heap.
    img = frame.to_image().convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


_processor: VideoProcessor = PyAvProbe()


def _sniff_video_mime_at_path(path: Path) -> str:
    # Reads only the first 12 bytes off disk — checked against real file
    # content, not the filename/extension, same rule the image pipeline
    # (media_service._sniff_image_type) follows. Never loads the full file.
    with open(path, "rb") as f:
        header = f.read(12)
    if len(header) >= 8 and header[4:8] == b"ftyp":
        return "video/mp4"
    if header[:4] == b"\x1a\x45\xdf\xa3":
        return "video/webm"
    raise AppError(code="invalid_file", message="File is not a recognized MP4 or WebM video.", status_code=422)


class VideoTranscodeError(Exception):
    def __init__(self, stderr: str):
        self.stderr = stderr
        super().__init__(f"ffmpeg transcode failed: {stderr[-2000:]}")


def _transcode_to_h264(source_path: Path, out_path: Path, slot: str) -> None:
    """Synchronous and CPU-bound — every caller must run this via
    `asyncio.to_thread` (or similar), never call it directly from an `async
    def` route/service. Re-encodes to H.264 MP4 via the static ffmpeg binary
    `imageio-ffmpeg` bundles in its wheel (no system `apt install ffmpeg` —
    works the same on Render's build image as it does locally). Reads
    `source_path` and writes `out_path` directly — ffmpeg does its own
    disk I/O as a separate OS process; nothing here touches Python-heap
    memory for the video bytes themselves.

    - `-an` drops audio entirely — hero videos are always muted/looped, so
      an audio track is pure dead weight.
    - the scale filter downscales (never upscales) to the slot's profile cap,
      preserving aspect ratio and rounding both dimensions to even numbers
      (required by yuv420p 4:2:0 chroma subsampling).
    - `-crf` is quality-targeted rather than a fixed bitrate, so a visually
      simple clip lands well under the cap instead of always spending the
      same bits.
    - `-threads` is fixed and small (see `_ENCODE_THREADS`) and is set
      *twice*: once before `-i` (an input-context option, bounds the
      decoder reading `source_path`) and once after `-c:v` (an
      output-context option, bounds the libx264 encoder). These are two
      independent ffmpeg option groups — setting only the output one, as an
      earlier version of this function did, leaves the decoder free to
      auto-detect the host's full core count and pay for that many
      full-resolution decoded-frame buffers. `-filter_threads` gets the same
      cap for the same reason, for the `scale` filter in between.
    - `+faststart` moves the MP4 moov atom to the front of the file so a
      browser can begin playback after downloading the first chunk instead
      of needing the full file first.
    - `-loglevel error` keeps ffmpeg's stderr to just real errors, not the
      default per-frame progress chatter — it's captured into parent-process
      memory below, so this also bounds how much that capture can hold.
    """
    profile = _COMPRESSION_PROFILES.get(slot, _COMPRESSION_PROFILES["desktop"])
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    max_dim = profile["max_dimension"]

    scale = (
        f"scale='if(gt(iw,ih),min(iw,{max_dim}),-2)':'if(gt(iw,ih),-2,min(ih,{max_dim}))':"
        "force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2"
    )

    cmd = [
        ffmpeg_exe,
        "-y",
        "-loglevel", "error",
        "-threads", str(_ENCODE_THREADS),  # input-context: bounds the decoder for -i below
        "-filter_threads", str(_ENCODE_THREADS),
        "-i", str(source_path),
        "-an",
        "-vf", scale,
        "-c:v", "libx264",
        "-preset", _ENCODE_PRESET,
        "-crf", str(profile["crf"]),
        "-threads", str(_ENCODE_THREADS),  # output-context: bounds the libx264 encoder
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(out_path),
    ]

    input_size_bytes = source_path.stat().st_size
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    logger.info(
        f"[hero_video_upload] slot={slot} step=ffmpeg_compression ffmpeg_pid={proc.pid} "
        f"input_size_bytes={input_size_bytes}"
    )
    try:
        _stdout, stderr = proc.communicate(timeout=_TRANSCODE_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        raise

    output_size_bytes = out_path.stat().st_size if out_path.exists() else 0
    logger.info(
        f"[hero_video_upload] slot={slot} step=ffmpeg_compression ffmpeg_pid={proc.pid} "
        f"ffmpeg_exit_code={proc.returncode} output_size_bytes={output_size_bytes}"
    )
    if proc.returncode != 0 or not out_path.exists() or output_size_bytes == 0:
        raise VideoTranscodeError(stderr)


def _stream_upload_to_path(file: UploadFile, dest: Path, max_bytes: int) -> int:
    """Copies the incoming upload to `dest` in fixed-size chunks, enforcing
    `max_bytes` as it goes (aborts as soon as the cap is crossed, rather than
    reading the whole — possibly huge — file first and rejecting it after).
    Runs synchronously (called from inside the `asyncio.to_thread` body, not
    the event loop) so it can use `file.file` — Starlette's underlying sync
    file object — directly. `file.file` is already disk-backed for anything
    over 1MB (Starlette's own `SpooledTemporaryFile` rolls to disk past that
    threshold before our code ever runs); reading it with `await file.read()`
    would pull an already-on-disk file straight back into a single Python
    `bytes` object for no reason. Copying disk-to-disk in chunks avoids ever
    holding the full upload in RAM at all."""
    file.file.seek(0)
    total = 0
    chunk_size = 1024 * 1024
    with open(dest, "wb") as out:
        while True:
            chunk = file.file.read(chunk_size)
            if not chunk:
                break
            total += len(chunk)
            if total > max_bytes:
                limit_mb = max_bytes // (1024 * 1024)
                raise AppError(
                    code="file_too_large",
                    message=f"Video is too large — please keep hero videos under {limit_mb}MB. Pre-compress before uploading.",
                    status_code=422,
                )
            out.write(chunk)
    return total


def _process_and_upload_hero_video(file: UploadFile, slot: str, uploaded_by: str) -> dict[str, Any]:
    """Synchronous body of `upload_hero_video` — everything here is either
    CPU-bound (ffmpeg, PyAV) or a blocking network call (Supabase Storage),
    so `upload_hero_video` runs this whole thing via `asyncio.to_thread`
    rather than awaiting it piecemeal on the event loop.

    Rewritten after a production incident: the previous version read the
    whole upload into a `bytes` object (`await file.read()`), wrapped it in
    `io.BytesIO` for probing (a second full copy), wrote it back out to a
    temp file for ffmpeg, then read ffmpeg's compressed output fully into a
    third `bytes` object before uploading. On a memory-constrained Render
    instance, that Python-side duplication — stacked on top of ffmpeg's own
    child-process memory for decoding/encoding — exceeded the container's
    RAM limit and got the whole service OOM-killed and restarted mid-upload.
    Every step below is disk-backed instead: the upload is stream-copied to
    a temp file, ffmpeg reads/writes temp files directly, PyAV probes by
    path, and the compressed result is uploaded from an open file handle —
    the video's bytes are never held as a single Python object anywhere in
    this function.

    Instrumented with `_timed_step` around every major step (see that
    helper's docstring) so a slow or OOM-killed upload can be diagnosed from
    the logs alone — which step it reached and how long each prior step
    took, not just "the request never completed." Purely additive logging;
    no control flow below was changed to add it.
    """
    request_start = time.perf_counter()
    max_bytes = get_settings().hero_video_max_bytes

    try:
        with tempfile.TemporaryDirectory(prefix="elato-hero-") as tmp_dir:
            source_path = Path(tmp_dir) / "source"
            out_path = Path(tmp_dir) / "output.mp4"

            with _timed_step("stream_to_temp_file", slot):
                total = _stream_upload_to_path(file, source_path, max_bytes)
            if total == 0:
                raise AppError(code="invalid_file", message="Uploaded file is empty.", status_code=422)

            _sniff_video_mime_at_path(source_path)  # cheap magic-byte check — reject junk before spending CPU on a transcode

            with _timed_step("metadata_probe_source", slot):
                # No poster needed here — only `final_probe`'s (below, on the
                # *compressed* output) is ever stored, so skip decoding one
                # from the source and throwing it away.
                source_probe = _processor.probe(str(source_path), include_poster=False)
            if source_probe.duration_seconds is not None and source_probe.duration_seconds > _MAX_DURATION_SECONDS:
                raise AppError(
                    code="video_too_long",
                    message=(
                        f"Hero videos must be {_MAX_DURATION_SECONDS}s or shorter (this one is "
                        f"{source_probe.duration_seconds:.1f}s) — they loop, so keep it short."
                    ),
                    status_code=422,
                )
            if source_probe.width and source_probe.height:
                if min(source_probe.width, source_probe.height) < _MIN_DIMENSION:
                    raise AppError(
                        code="video_too_small",
                        message=f"Resolution is too low ({source_probe.width}x{source_probe.height}) — minimum {_MIN_DIMENSION}px on the shorter side.",
                        status_code=422,
                    )
                if max(source_probe.width, source_probe.height) > _MAX_DIMENSION:
                    raise AppError(
                        code="video_dimensions_too_large",
                        message=f"Resolution is too high ({source_probe.width}x{source_probe.height}) — please pre-compress to {_MAX_DIMENSION}px or under on the longer side.",
                        status_code=422,
                    )

            with _timed_step("ffmpeg_compression", slot):
                try:
                    _transcode_to_h264(source_path, out_path, slot)
                except (VideoTranscodeError, subprocess.TimeoutExpired) as exc:
                    stderr = exc.stderr if isinstance(exc, VideoTranscodeError) else str(exc)
                    logger.error(f"Hero video transcode failed for slot={slot}: {stderr[-2000:] if stderr else stderr}")
                    raise AppError(
                        code="video_processing_failed",
                        message="We couldn't process this video. Try re-exporting it as a standard H.264/MP4 file and upload again.",
                        status_code=502,
                    ) from exc

            # Re-probe the *compressed* output — the transcode may have downscaled
            # it, so this is what's actually being delivered, not the source's stats.
            # This single PyAV call does both metadata probing AND poster-frame
            # extraction/encoding in one pass (see PyAvProbe) — they aren't two
            # separate calls in this implementation, so they can't be timed
            # separately without restructuring that class, which is out of scope
            # for a logging-only change. Named to make that explicit rather than
            # mislabel it as just one or the other.
            with _timed_step("metadata_probe_and_poster_generation", slot):
                final_probe = _processor.probe(str(out_path))
            mime = "video/mp4"  # transcode output is always H.264/MP4 now, regardless of the source container
            ext = "mp4"

            supabase = get_supabase()
            stem = uuid.uuid4().hex
            video_path = f"{slot}/{stem}.{ext}"
            with _timed_step("upload_video_to_supabase", slot):
                with open(out_path, "rb") as f:
                    supabase.storage.from_(VIDEO_BUCKET).upload(
                        video_path, f, {"content-type": mime, "cache-control": "31536000"}
                    )
            file_size_bytes = out_path.stat().st_size

            poster_bucket = None
            poster_path = None
            if final_probe.poster_jpeg:
                candidate_poster_path = f"hero-video-posters/{slot}/{stem}.jpg"
                with _timed_step("upload_poster_to_supabase", slot):
                    try:
                        supabase.storage.from_(POSTER_BUCKET).upload(
                            candidate_poster_path,
                            final_probe.poster_jpeg,
                            {"content-type": "image/jpeg", "cache-control": "31536000"},
                        )
                        poster_bucket = POSTER_BUCKET
                        poster_path = candidate_poster_path
                    except Exception as exc:
                        # The video above is already uploaded and about to become the
                        # slot's canonical file — failing the whole request over a poster
                        # hiccup would strand that just-uploaded video as an orphan with
                        # nothing pointing at it. Degrade to "no poster" instead (the
                        # same state a PyAV extraction failure already produces, which
                        # every downstream consumer already handles) rather than raising.
                        logger.error(f"Hero poster upload failed for slot={slot}, continuing without a poster: {exc}")

            with _timed_step("database_update", slot):
                existing = hero_background_repository.get_by_slot(slot)
                row = hero_background_repository.upsert(
                    slot,
                    {
                        "video_bucket": VIDEO_BUCKET,
                        "video_path": video_path,
                        "video_mime": mime,
                        "file_size_bytes": file_size_bytes,
                        "width": final_probe.width or source_probe.width,
                        "height": final_probe.height or source_probe.height,
                        "duration_seconds": final_probe.duration_seconds or source_probe.duration_seconds,
                        "poster_bucket": poster_bucket,
                        "poster_path": poster_path,
                        "uploaded_by": uploaded_by,
                    },
                )

            if existing:
                _delete_storage_object(existing["video_bucket"], existing["video_path"])
                if existing.get("poster_bucket") and existing.get("poster_path"):
                    media_service.delete_image_variants(existing["poster_bucket"], existing["poster_path"])

            return row
    finally:
        # By this point `TemporaryDirectory.__exit__` has already run (it
        # wraps everything above, including the `return`), so source_path/
        # out_path and their containing tmp_dir are already deleted from
        # disk — this log line is confirmation of that, not a separate
        # cleanup step. The RSS reading here is what to compare against each
        # step's own rss_after (logged by `_timed_step`) to see whether
        # memory was actually released once ffmpeg exited and the temp files
        # were removed, or whether it's still held by the process.
        total_ms = (time.perf_counter() - request_start) * 1000
        logger.info(
            f"[hero_video_upload] slot={slot} step=total_request duration_ms={total_ms:.1f} "
            f"tmp_dir_cleaned_up=true rss_after_cleanup_kb={_current_rss_kb()}"
        )


async def upload_hero_video(file: UploadFile, slot: str, uploaded_by: str) -> dict[str, Any]:
    if slot not in SLOTS:
        raise AppError(code="invalid_slot", message=f"Slot must be one of {SLOTS}.", status_code=422)

    # `file` itself (not its bytes) is handed to the thread — see
    # `_stream_upload_to_path` for why reading it here first would defeat the
    # whole point.
    return await asyncio.to_thread(_process_and_upload_hero_video, file, slot, uploaded_by)


async def upload_hero_poster(file: UploadFile, slot: str, uploaded_by: str) -> dict[str, Any]:
    """Manual poster fallback for when automatic extraction wasn't feasible
    (PyAV unavailable, unusual codec, extraction failure, etc.) — routes
    through the same optimized image pipeline every other admin image
    upload uses, so the stored poster gets the usual resize/WebP treatment."""
    if slot not in SLOTS:
        raise AppError(code="invalid_slot", message=f"Slot must be one of {SLOTS}.", status_code=422)

    existing = hero_background_repository.get_by_slot(slot)
    if not existing:
        raise AppError(code="not_found", message=f"Upload a {slot} hero video first.", status_code=404)

    media_row, _variants = await media_service.process_and_store(file, POSTER_BUCKET, f"{slot} hero poster", uploaded_by)

    old_poster_bucket, old_poster_path = existing.get("poster_bucket"), existing.get("poster_path")
    row = hero_background_repository.upsert(
        slot, {"poster_bucket": POSTER_BUCKET, "poster_path": media_row["storage_path"]}
    )

    if old_poster_bucket and old_poster_path and old_poster_path != media_row["storage_path"]:
        media_service.delete_image_variants(old_poster_bucket, old_poster_path)

    return row


def delete_hero_video(slot: str) -> None:
    if slot not in SLOTS:
        raise AppError(code="invalid_slot", message=f"Slot must be one of {SLOTS}.", status_code=422)
    row = hero_background_repository.get_by_slot(slot)
    if not row:
        return
    _delete_storage_object(row["video_bucket"], row["video_path"])
    if row.get("poster_bucket") and row.get("poster_path"):
        media_service.delete_image_variants(row["poster_bucket"], row["poster_path"])
    hero_background_repository.delete(slot)


def _delete_storage_object(bucket: str, path: str) -> None:
    try:
        get_supabase().storage.from_(bucket).remove([path])
    except Exception:
        pass  # best-effort cleanup — a dangling old object is harmless, unlike failing the request over it


def resolve_urls(row: dict[str, Any]) -> tuple[str, str | None]:
    supabase = get_supabase()
    video_url = supabase.storage.from_(row["video_bucket"]).get_public_url(row["video_path"])
    poster_url = None
    if row.get("poster_bucket") and row.get("poster_path"):
        poster_url = supabase.storage.from_(row["poster_bucket"]).get_public_url(row["poster_path"])
    return video_url, poster_url


def to_schema(row: dict[str, Any]):
    """Shared row -> HeroBackgroundOut mapping for both the admin and public
    routers, so URL resolution logic lives in exactly one place."""
    from app.schemas.hero_background import HeroBackgroundOut

    video_url, poster_url = resolve_urls(row)
    return HeroBackgroundOut(
        slot=row["slot"],
        video_url=video_url,
        video_mime=row["video_mime"],
        poster_url=poster_url,
        width=row.get("width"),
        height=row.get("height"),
        duration_seconds=row.get("duration_seconds"),
        file_size_bytes=row["file_size_bytes"],
        updated_at=row["updated_at"],
    )
