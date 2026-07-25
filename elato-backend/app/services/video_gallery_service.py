"""
Admin-managed video showcase — replaces the removed Instagram Graph API
integration. At most five videos ever exist: uploading a genuinely new one
evicts the oldest (storage object + row) once the count would exceed five.
Replacing an existing video's file is explicitly NOT treated as a new
upload — its row, and therefore its position in the newest-first ordering,
is left untouched; only the stored file and its metadata change.

Deliberately lighter than hero_video_service: no transcode, no duration/
dimension probing, no poster extraction. The spec calls for preserving
original quality and rejecting anything over the size cap outright rather
than re-encoding it down, so there's no ffmpeg step here at all — just
stream-to-temp-file, validate, upload.
"""

from __future__ import annotations

import asyncio
import tempfile
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from fastapi import UploadFile

from app.core.exceptions import AppError, NotFoundError
from app.db import get_supabase
from app.repositories import video_gallery_repository

BUCKET = "video-gallery"

# Resource-exhaustion guard as much as a UX one — this is a "small, punchy
# highlight reel" feature, not a video host; 30MB comfortably fits a short
# H.264/VP9 clip at good quality without needing to touch the file.
MAX_BYTES = 30 * 1024 * 1024
MAX_VIDEOS = 5

_ALLOWED_INSTAGRAM_HOSTS = {"instagram.com", "www.instagram.com"}


def _sniff_video_mime_at_path(path: Path) -> str:
    # Reads only the first 12 bytes off disk — checked against real file
    # content, not the filename/extension, same rule hero_video_service and
    # media_service already follow. Never loads the full file.
    with open(path, "rb") as f:
        header = f.read(12)
    if len(header) >= 8 and header[4:8] == b"ftyp":
        return "video/mp4"
    if header[:4] == b"\x1a\x45\xdf\xa3":
        return "video/webm"
    raise AppError(code="invalid_file", message="File is not a recognized MP4 or WebM video.", status_code=422)


def _stream_upload_to_path(file: UploadFile, dest: Path, max_bytes: int) -> int:
    """Disk-to-disk copy in fixed chunks, aborting as soon as `max_bytes` is
    crossed rather than reading the whole file first — same pattern as
    hero_video_service, never holds the upload in RAM as a single object."""
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
                    message=f"Video is too large — please keep uploads under {limit_mb}MB.",
                    status_code=422,
                )
            out.write(chunk)
    return total


def _normalize_instagram_url(url: str | None) -> str | None:
    """Only instagram.com / www.instagram.com links are ever stored —
    anything else (empty, malformed, a different domain entirely) is
    silently normalized to NULL rather than rejecting the whole request:
    the Instagram link is optional, and the public site already falls back
    to the ELATŌ profile whenever it's missing."""
    if not url or not url.strip():
        return None
    try:
        parsed = urlparse(url.strip())
    except ValueError:
        return None
    if parsed.scheme not in ("http", "https"):
        return None
    if (parsed.hostname or "").lower() not in _ALLOWED_INSTAGRAM_HOSTS:
        return None
    return url.strip()


def _delete_storage_object(path: str) -> None:
    try:
        get_supabase().storage.from_(BUCKET).remove([path])
    except Exception:
        pass  # best-effort cleanup — a dangling old object is harmless, unlike failing the request over it


def _evict_oldest_beyond_limit() -> None:
    rows = video_gallery_repository.list_all()  # newest first
    for stale in rows[MAX_VIDEOS:]:
        _delete_storage_object(stale["storage_path"])
        video_gallery_repository.delete(stale["id"])


def _upload_video_file(file: UploadFile) -> tuple[str, str, int]:
    """Streams, validates, and uploads `file` to Storage. Returns
    (storage_path, mime, size_bytes). Shared by create and replace so both
    endpoints enforce identical size/format rules."""
    with tempfile.TemporaryDirectory(prefix="elato-video-gallery-") as tmp_dir:
        source_path = Path(tmp_dir) / "source"
        total = _stream_upload_to_path(file, source_path, MAX_BYTES)
        if total == 0:
            raise AppError(code="invalid_file", message="Uploaded file is empty.", status_code=422)

        mime = _sniff_video_mime_at_path(source_path)
        ext = "mp4" if mime == "video/mp4" else "webm"
        storage_path = f"{uuid.uuid4().hex}.{ext}"

        with open(source_path, "rb") as f:
            get_supabase().storage.from_(BUCKET).upload(
                storage_path, f, {"content-type": mime, "cache-control": "31536000"}
            )
        return storage_path, mime, total


async def upload_video(
    file: UploadFile, caption: str | None, instagram_url: str | None, uploaded_by: str
) -> dict[str, Any]:
    storage_path, mime, size = await asyncio.to_thread(_upload_video_file, file)

    row = video_gallery_repository.insert(
        {
            "storage_path": storage_path,
            "video_mime": mime,
            "file_size_bytes": size,
            "caption": (caption or "").strip() or None,
            "instagram_url": _normalize_instagram_url(instagram_url),
            "uploaded_by": uploaded_by,
        }
    )

    # Only a genuinely new upload evicts — this is why replace_video_file
    # below never calls this.
    await asyncio.to_thread(_evict_oldest_beyond_limit)
    return row


async def replace_video_file(video_id: str, file: UploadFile) -> dict[str, Any]:
    """Replaces the stored file only — caption, instagram_url, and
    created_at (i.e. this row's position in the newest-first ordering) are
    left untouched. Not a new upload, so it never triggers eviction."""
    existing = video_gallery_repository.get(video_id)
    if not existing:
        raise NotFoundError("Video not found")

    storage_path, mime, size = await asyncio.to_thread(_upload_video_file, file)
    row = video_gallery_repository.update(
        video_id, {"storage_path": storage_path, "video_mime": mime, "file_size_bytes": size}
    )
    await asyncio.to_thread(_delete_storage_object, existing["storage_path"])
    return row


def update_details(video_id: str, fields: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    if "caption" in fields:
        payload["caption"] = (fields["caption"] or "").strip() or None
    if "instagram_url" in fields:
        payload["instagram_url"] = _normalize_instagram_url(fields["instagram_url"])

    if not payload:
        existing = video_gallery_repository.get(video_id)
        if not existing:
            raise NotFoundError("Video not found")
        return existing

    return video_gallery_repository.update(video_id, payload)


def delete_video(video_id: str) -> None:
    row = video_gallery_repository.get(video_id)
    if not row:
        return
    _delete_storage_object(row["storage_path"])
    video_gallery_repository.delete(video_id)


def resolve_url(row: dict[str, Any]) -> str:
    return get_supabase().storage.from_(BUCKET).get_public_url(row["storage_path"])


def to_schema(row: dict[str, Any]):
    """Shared row -> VideoGalleryOut mapping for both the admin and public
    routers, so URL resolution logic lives in exactly one place."""
    from app.schemas.video_gallery import VideoGalleryOut

    return VideoGalleryOut(
        id=row["id"],
        video_url=resolve_url(row),
        video_mime=row["video_mime"],
        file_size_bytes=row["file_size_bytes"],
        caption=row.get("caption"),
        instagram_url=row.get("instagram_url"),
        created_at=row["created_at"],
    )
