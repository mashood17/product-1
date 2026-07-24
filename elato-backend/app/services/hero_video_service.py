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

Deliberately structured so that changes: everything that inspects or
transforms the raw bytes goes through the `VideoProcessor` protocol below.
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

logger = logging.getLogger("elato.hero_video")

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


@dataclass
class VideoProbe:
    width: int | None = None
    height: int | None = None
    duration_seconds: float | None = None
    poster_jpeg: bytes | None = None


class VideoProcessor(Protocol):
    def probe(self, raw: bytes) -> VideoProbe: ...


class PyAvProbe:
    """Best-effort metadata + poster-frame extraction using PyAV. Any
    failure (library not installed, unsupported container, corrupt file)
    degrades to an empty probe rather than blocking the upload — duration/
    dimension checks are simply skipped, and the admin can upload a poster
    image manually via the fallback endpoint."""

    def probe(self, raw: bytes) -> VideoProbe:
        try:
            import av
        except ImportError:
            return VideoProbe()

        try:
            container = av.open(io.BytesIO(raw))
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
    img = frame.to_image().convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


_processor: VideoProcessor = PyAvProbe()


def _sniff_video_mime(raw: bytes) -> str:
    # Checked against real file content, not the filename/extension — same
    # rule the image pipeline (media_service._sniff_image_type) follows.
    if len(raw) >= 8 and raw[4:8] == b"ftyp":
        return "video/mp4"
    if raw[:4] == b"\x1a\x45\xdf\xa3":
        return "video/webm"
    raise AppError(code="invalid_file", message="File is not a recognized MP4 or WebM video.", status_code=422)


class VideoTranscodeError(Exception):
    def __init__(self, stderr: str):
        self.stderr = stderr
        super().__init__(f"ffmpeg transcode failed: {stderr[-2000:]}")


def _transcode_to_h264(raw: bytes, slot: str) -> bytes:
    """Synchronous and CPU-bound — every caller must run this via
    `asyncio.to_thread` (or similar), never call it directly from an `async
    def` route/service. Re-encodes to H.264 MP4 via the static ffmpeg binary
    `imageio-ffmpeg` bundles in its wheel (no system `apt install ffmpeg` —
    works the same on Render's build image as it does locally):

    - `-an` drops audio entirely — hero videos are always muted/looped, so
      an audio track is pure dead weight.
    - the scale filter downscales (never upscales) to the slot's profile cap,
      preserving aspect ratio and rounding both dimensions to even numbers
      (required by yuv420p 4:2:0 chroma subsampling).
    - `-crf` is quality-targeted rather than a fixed bitrate, so a visually
      simple clip lands well under the cap instead of always spending the
      same bits.
    - `+faststart` moves the MP4 moov atom to the front of the file so a
      browser can begin playback after downloading the first chunk instead
      of needing the full file first.
    """
    profile = _COMPRESSION_PROFILES.get(slot, _COMPRESSION_PROFILES["desktop"])
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    max_dim = profile["max_dimension"]

    scale = (
        f"scale='if(gt(iw,ih),min(iw,{max_dim}),-2)':'if(gt(iw,ih),-2,min(ih,{max_dim}))':"
        "force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2"
    )

    with tempfile.TemporaryDirectory(prefix="elato-hero-") as tmp_dir:
        in_path = Path(tmp_dir) / "source"
        out_path = Path(tmp_dir) / "output.mp4"
        in_path.write_bytes(raw)

        cmd = [
            ffmpeg_exe,
            "-y",
            "-i", str(in_path),
            "-an",
            "-vf", scale,
            "-c:v", "libx264",
            "-preset", _ENCODE_PRESET,
            "-crf", str(profile["crf"]),
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(out_path),
        ]
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=_TRANSCODE_TIMEOUT_SECONDS
        )
        if result.returncode != 0 or not out_path.exists() or out_path.stat().st_size == 0:
            raise VideoTranscodeError(result.stderr)

        return out_path.read_bytes()


def _process_and_upload_hero_video(raw: bytes, slot: str, uploaded_by: str) -> dict[str, Any]:
    """Synchronous body of `upload_hero_video` — everything here is either
    CPU-bound (ffmpeg, PyAV) or a blocking network call (Supabase Storage),
    so `upload_hero_video` runs this whole thing via `asyncio.to_thread`
    rather than awaiting it piecemeal on the event loop."""
    _sniff_video_mime(raw)  # cheap magic-byte check — reject junk before spending CPU on a transcode

    source_probe = _processor.probe(raw)
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

    try:
        compressed = _transcode_to_h264(raw, slot)
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
    final_probe = _processor.probe(compressed)
    mime = "video/mp4"  # transcode output is always H.264/MP4 now, regardless of the source container
    ext = "mp4"

    supabase = get_supabase()
    stem = uuid.uuid4().hex
    video_path = f"{slot}/{stem}.{ext}"
    supabase.storage.from_(VIDEO_BUCKET).upload(
        video_path, compressed, {"content-type": mime, "cache-control": "31536000"}
    )

    poster_bucket = None
    poster_path = None
    if final_probe.poster_jpeg:
        candidate_poster_path = f"hero-video-posters/{slot}/{stem}.jpg"
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

    existing = hero_background_repository.get_by_slot(slot)
    row = hero_background_repository.upsert(
        slot,
        {
            "video_bucket": VIDEO_BUCKET,
            "video_path": video_path,
            "video_mime": mime,
            "file_size_bytes": len(compressed),
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


async def upload_hero_video(file: UploadFile, slot: str, uploaded_by: str) -> dict[str, Any]:
    if slot not in SLOTS:
        raise AppError(code="invalid_slot", message=f"Slot must be one of {SLOTS}.", status_code=422)

    raw = await file.read()
    if not raw:
        raise AppError(code="invalid_file", message="Uploaded file is empty.", status_code=422)

    max_bytes = get_settings().hero_video_max_bytes
    if len(raw) > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise AppError(
            code="file_too_large",
            message=f"Video is too large — please keep hero videos under {limit_mb}MB. Pre-compress before uploading.",
            status_code=422,
        )

    return await asyncio.to_thread(_process_and_upload_hero_video, raw, slot, uploaded_by)


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
