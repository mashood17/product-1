"""
Admin-managed hero background videos (desktop + mobile slots).

Validates -> transcodes *only if the source isn't already browser-delivery
compatible* -> stores the result in Supabase Storage -> probes duration/
dimensions and extracts a poster frame via PyAV (which bundles its own
decoder libraries, so no system ffmpeg install is required for that half).

Conditional transcode, not "always" or "never": a source that's already an
MP4 container with an H.264 video stream (and either no audio or AAC audio)
is already exactly what every browser hero-video consumer needs, so it's
validated and uploaded as-is — re-encoding it would only cost CPU for no
benefit. A source in any other container/codec (WebM/VP9, MOV/HEVC off an
iPhone, etc.) gets transcoded to H.264 MP4 via a bundled static ffmpeg
binary, same as before, so playback compatibility is never in question. The
25MB size cap (`get_settings().hero_video_max_bytes`) still guards CPU/RAM
on the transcode path regardless of which branch a given upload takes.

Everything here is disk-backed, not RAM-backed: the incoming upload is
stream-copied to a temp file (never held as one big `bytes` object), ffmpeg
(when it runs) reads/writes temp files directly, and the stored result is
uploaded from an open file handle. This matters on a memory-constrained
Render instance — see the module-level comment on
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
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

import imageio_ffmpeg
from fastapi import UploadFile

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.db import get_supabase
from app.repositories import hero_background_repository
from app.services import media_service
from app.utils.perf import current_rss_kb, timed_step

logger = logging.getLogger("elato.hero_video")


def _timed_step(step: str, slot: str):
    return timed_step(logger, f"hero_video_upload slot={slot}", step)


VIDEO_BUCKET = "hero-videos"
POSTER_BUCKET = "hero"
SLOTS = ("desktop", "mobile")

# Hero videos loop — anything longer is almost certainly the wrong file, not
# a legitimate hero clip.
_MAX_DURATION_SECONDS = 20
_MIN_DIMENSION = 480
_MAX_DIMENSION = 3840

# A source already in this shape needs no transcode: MP4 container, H.264
# video, and either no audio track or an AAC one. Anything else (WebM/VP9,
# a phone's HEVC/MOV export, MP3/PCM audio, etc.) falls through to
# `_transcode_to_h264` for guaranteed browser playback.
_COMPATIBLE_VIDEO_CODECS = {"h264"}
_COMPATIBLE_AUDIO_CODECS = {"aac"}

# Delivery profile per slot, used only on the transcode fallback path (a
# source that's already compatible is stored as-is, at its own resolution).
# Hero videos are decorative, always muted, and looped, so there is no
# reason to ship source resolution/bitrate when a transcode is already
# happening anyway. CRF (quality-targeted, not a fixed bitrate) means output
# size tracks actual scene complexity. "mobile" gets a lower cap and a
# slightly higher CRF on top of that, since it's already the smaller-by-
# design slot and is disproportionately likely to be on a constrained
# connection.
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
# one does not set the other. `-filter_threads` gets the same cap for the
# same reason, for the `scale` filter in between.
_ENCODE_THREADS = 2


@dataclass
class VideoProbe:
    width: int | None = None
    height: int | None = None
    duration_seconds: float | None = None
    video_codec: str | None = None
    audio_codec: str | None = None
    has_audio: bool = False
    poster_jpeg: bytes | None = None


class VideoProcessor(Protocol):
    def probe(self, path: str) -> VideoProbe: ...


class PyAvProbe:
    """Best-effort metadata + poster-frame extraction using PyAV, reading
    directly from a file path (never a `BytesIO`-wrapped in-memory copy —
    PyAV/libav can open a path natively, so there's no reason to duplicate
    the file into RAM just to hand it a stream). Any failure (library not
    installed, unsupported container, corrupt file) degrades to an empty
    probe rather than blocking the upload — duration/dimension checks are
    simply skipped, and the admin can upload a poster image manually via the
    fallback endpoint.

    Also reports the video/audio codec names (`video_codec`/`audio_codec`)
    so `_process_and_upload_hero_video` can decide whether a source is
    already browser-delivery compatible and skip transcoding it."""

    def probe(self, path: str) -> VideoProbe:
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
                video_codec = stream.codec_context.name if stream.codec_context else None

                audio_stream = next((s for s in container.streams if s.type == "audio"), None)
                audio_codec = audio_stream.codec_context.name if audio_stream and audio_stream.codec_context else None

                duration_seconds: float | None = None
                if stream.duration and stream.time_base:
                    duration_seconds = float(stream.duration * stream.time_base)
                elif container.duration:
                    duration_seconds = container.duration / 1_000_000

                poster_jpeg = None
                try:
                    for frame in container.decode(stream):
                        poster_jpeg = _frame_to_jpeg(frame)
                        break
                except Exception:
                    poster_jpeg = None

                return VideoProbe(
                    width=width,
                    height=height,
                    duration_seconds=duration_seconds,
                    video_codec=video_codec,
                    audio_codec=audio_codec,
                    has_audio=audio_stream is not None,
                    poster_jpeg=poster_jpeg,
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


def _needs_transcode(mime: str, probe: VideoProbe) -> bool:
    """True unless the source is already exactly what every browser hero-
    video consumer needs: an MP4 container, an H.264 video stream, and
    either no audio track or an AAC one. `probe.video_codec`/`audio_codec`
    come from PyAV reading the real stream headers, not the container
    extension, so a `.mp4` file with e.g. HEVC video still correctly falls
    through to a transcode."""
    if mime != "video/mp4":
        return True
    if probe.video_codec not in _COMPATIBLE_VIDEO_CODECS:
        return True
    if probe.has_audio and probe.audio_codec not in _COMPATIBLE_AUDIO_CODECS:
        return True
    return False


class VideoTranscodeError(Exception):
    def __init__(self, stderr: str):
        self.stderr = stderr
        super().__init__(f"ffmpeg transcode failed: {stderr[-2000:]}")


def _transcode_to_h264(source_path: Path, out_path: Path, slot: str) -> None:
    """Synchronous and CPU-bound — every caller must run this via
    `asyncio.to_thread` (or similar), never call it directly from an `async
    def` route/service. Only reached when `_needs_transcode` is True, i.e.
    the source isn't already browser-compatible. Re-encodes to H.264 MP4 via
    the static ffmpeg binary `imageio-ffmpeg` bundles in its wheel (no system
    `apt install ffmpeg` — works the same on Render's build image as it does
    locally). Reads `source_path` and writes `out_path` directly — ffmpeg
    does its own disk I/O as a separate OS process; nothing here touches
    Python-heap memory for the video bytes themselves.

    - `-an` drops audio entirely — hero videos are always muted/looped, so
      an audio track is pure dead weight (and if we're here, the source
      audio wasn't AAC anyway, so it's being dropped rather than
      re-transcoded to save the extra encode pass).
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
      independent ffmpeg option groups — setting only the output one leaves
      the decoder free to auto-detect the host's full core count and pay
      for that many full-resolution decoded-frame buffers. `-filter_threads`
      gets the same cap for the same reason, for the `scale` filter in
      between.
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
    CPU-bound (PyAV probing, occasionally ffmpeg) or a blocking network call
    (Supabase Storage), so `upload_hero_video` runs this whole thing via
    `asyncio.to_thread` rather than awaiting it piecemeal on the event loop.

    Conditional transcode: per the production upload audit, re-encoding
    *every* upload through ffmpeg was what made hero uploads slow (CRF-
    quality libx264 on Render's CPU-throttled Starter plan) even though most
    admin-exported clips are already H.264 MP4 and need no re-encoding at
    all for browser playback. `_needs_transcode` (checked against the real
    stream headers via PyAV, not the file extension) decides per-upload: an
    already-compatible source is validated and stored as-is; anything else
    still gets the same ffmpeg transcode as before, so compatibility is
    never sacrificed for speed. The 25MB size cap
    (`get_settings().hero_video_max_bytes`) bounds both paths regardless.

    Disk-backed throughout: the upload is stream-copied to a temp file
    (never held as one big `bytes` object), ffmpeg (when it runs) reads/
    writes temp files directly, and the stored result is uploaded from an
    open file handle.

    Instrumented with `_timed_step` around every major step (see that
    helper's docstring) so a slow upload can be diagnosed from the logs
    alone — which step it reached, how long each prior step took, and
    (via the `compatibility_check` log line) whether it took the transcode
    path at all.
    """
    request_start = time.perf_counter()
    max_bytes = get_settings().hero_video_max_bytes

    try:
        with tempfile.TemporaryDirectory(prefix="elato-hero-") as tmp_dir:
            source_path = Path(tmp_dir) / "source"

            with _timed_step("stream_to_temp_file", slot):
                total = _stream_upload_to_path(file, source_path, max_bytes)
            if total == 0:
                raise AppError(code="invalid_file", message="Uploaded file is empty.", status_code=422)

            mime = _sniff_video_mime_at_path(source_path)  # cheap magic-byte check — reject junk before any CPU work

            with _timed_step("metadata_probe_source", slot):
                probe = _processor.probe(str(source_path))
            if probe.duration_seconds is not None and probe.duration_seconds > _MAX_DURATION_SECONDS:
                raise AppError(
                    code="video_too_long",
                    message=(
                        f"Hero videos must be {_MAX_DURATION_SECONDS}s or shorter (this one is "
                        f"{probe.duration_seconds:.1f}s) — they loop, so keep it short."
                    ),
                    status_code=422,
                )
            if probe.width and probe.height:
                if min(probe.width, probe.height) < _MIN_DIMENSION:
                    raise AppError(
                        code="video_too_small",
                        message=f"Resolution is too low ({probe.width}x{probe.height}) — minimum {_MIN_DIMENSION}px on the shorter side.",
                        status_code=422,
                    )
                if max(probe.width, probe.height) > _MAX_DIMENSION:
                    raise AppError(
                        code="video_dimensions_too_large",
                        message=f"Resolution is too high ({probe.width}x{probe.height}) — please pre-compress to {_MAX_DIMENSION}px or under on the longer side.",
                        status_code=422,
                    )

            transcode_needed = _needs_transcode(mime, probe)
            logger.info(
                f"[hero_video_upload] slot={slot} step=compatibility_check transcode_needed={transcode_needed} "
                f"container={mime} video_codec={probe.video_codec} audio_codec={probe.audio_codec} "
                f"has_audio={probe.has_audio}"
            )

            if transcode_needed:
                out_path = Path(tmp_dir) / "output.mp4"
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

                # Re-probe the *compressed* output — the transcode may have
                # downscaled it and always drops audio, so this is what's
                # actually being delivered, not the source's stats. The
                # source-side poster decoded above (if any) is discarded in
                # favor of this one.
                with _timed_step("metadata_probe_and_poster_generation", slot):
                    probe = _processor.probe(str(out_path))
                upload_path = out_path
                mime = "video/mp4"
            else:
                upload_path = source_path

            ext = "mp4"  # both branches land on MP4: transcode output always is, and only an MP4 source skips it
            supabase = get_supabase()
            stem = uuid.uuid4().hex
            video_path = f"{slot}/{stem}.{ext}"
            with _timed_step("upload_video_to_supabase", slot):
                with open(upload_path, "rb") as f:
                    supabase.storage.from_(VIDEO_BUCKET).upload(
                        video_path, f, {"content-type": mime, "cache-control": "31536000"}
                    )
            file_size_bytes = upload_path.stat().st_size

            poster_bucket = None
            poster_path = None
            if probe.poster_jpeg:
                candidate_poster_path = f"hero-video-posters/{slot}/{stem}.jpg"
                with _timed_step("upload_poster_to_supabase", slot):
                    try:
                        supabase.storage.from_(POSTER_BUCKET).upload(
                            candidate_poster_path,
                            probe.poster_jpeg,
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
                        "width": probe.width,
                        "height": probe.height,
                        "duration_seconds": probe.duration_seconds,
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
        # cleanup step.
        total_ms = (time.perf_counter() - request_start) * 1000
        logger.info(
            f"[hero_video_upload] slot={slot} step=total_request duration_ms={total_ms:.1f} "
            f"tmp_dir_cleaned_up=true rss_after_cleanup_kb={current_rss_kb()}"
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
