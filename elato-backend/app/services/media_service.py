"""
Upload -> validate -> resize -> convert -> store -> record, in one place.
Every admin upload (menu photos, gallery, room photos, etc.) goes through
`process_and_store`; nothing writes to Storage or the `media` table directly.

Image *replacement* cleanup (deleting the previous image's Storage variants
once an entity has been repointed at a new one) also lives here —
`update_with_image_cleanup`/`update_with_image_list_cleanup` are the single
reusable entry points every admin router's update endpoint calls, so the
delete-old-variants logic exists in exactly one place rather than being
copy-pasted per entity.
"""

import asyncio
import io
import logging
import uuid
from dataclasses import dataclass
from typing import Any, Callable

from PIL import Image, ImageOps
from fastapi import UploadFile

import pillow_avif  # noqa: F401  registers the AVIF codec with Pillow on import
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.db import get_supabase
from app.repositories import media_repository

logger = logging.getLogger("elato.media_cleanup")

# First few bytes of each format — checked against the real file content,
# never the filename/extension, per the media-pipeline spec.
_MAGIC_BYTES: dict[bytes, str] = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"RIFF": "image/webp",  # WEBP also needs bytes 8-12 == "WEBP", checked below
}

_BREAKPOINTS = {"thumbnail": 320, "sm": 640, "lg": 1280}
_ENCODE_QUALITY = 82  # 80-85% per the media-pipeline spec — visually lossless, meaningfully smaller
# Decompression-bomb / memory guard on the *decoded* dimensions, independent of
# the byte-size cap. Sized to comfortably admit legitimate high-resolution
# photography (50MP covers current phones and most DSLRs) while still rejecting
# absurd/hostile pixel counts before we allocate a bitmap for them.
_MAX_PIXELS = 50_000_000
# Must match the buckets that actually exist in the live Supabase project —
# migration 0001's `insert into storage.buckets` used different names
# (menu-images/hero-assets/rooms/avatars) that were never applied; the
# buckets that exist were created separately, matching the product brief's
# Section 4 table. Corrected here rather than editing 0001.
_VALID_BUCKETS = {
    "public-assets",
    "logos",
    "hero",
    "gallery",
    "categories",
    "menu",
    "events",
    "stay",
    "reviews",
    "uploads",
}


@dataclass
class StoredVariant:
    url: str
    width: int
    height: int
    format: str


def public_url_for(bucket: str | None, storage_path: str | None) -> str | None:
    """
    Resolve a stored media row's (bucket, storage_path) to its optimized public
    URL. `storage_path` is the canonical `lg.webp` variant written by
    `process_and_store`, so callers get the optimized image, not the original.
    Returns None for missing/incomplete media so callers can fall back safely.
    Single source of truth for public endpoints that embed a `media` row
    (gallery, categories, menu items, specials) — no duplicated resolution.
    """
    if not bucket or not storage_path:
        return None
    return get_supabase().storage.from_(bucket).get_public_url(storage_path)


def pop_embedded_media_url(row: dict) -> str | None:
    """Consume an embedded `media(storage_path, bucket)` join off a row and
    resolve it to a public URL. Mutates `row` (removes the `media` key) so the
    remaining fields map cleanly onto the response schema."""
    media = row.pop("media", None) or {}
    return public_url_for(media.get("bucket"), media.get("storage_path"))


def responsive_srcset_for(bucket: str | None, storage_path: str | None) -> str | None:
    """
    Build a `srcset` attribute value covering all three breakpoint variants
    `process_and_store` already wrote alongside the canonical `lg.webp`
    (thumbnail.webp/320w, sm.webp/640w, lg.webp/1280w) — same bucket, same
    `{stem}/` prefix, just the filename swapped. Every consumer of
    `public_url_for` was resolving only the largest (1280px) variant
    regardless of how small the image actually renders on screen; this lets
    callers hand the browser the full set so it can pick the smallest one
    that covers the real display size instead of always downloading `lg`.
    Returns None if `storage_path` isn't the expected `.../lg.webp` shape.
    """
    if not bucket or not storage_path or not storage_path.endswith("/lg.webp"):
        return None
    stem = storage_path.removesuffix("/lg.webp")
    parts = [
        (f"{stem}/thumbnail.webp", _BREAKPOINTS["thumbnail"]),
        (f"{stem}/sm.webp", _BREAKPOINTS["sm"]),
        (f"{stem}/lg.webp", _BREAKPOINTS["lg"]),
    ]
    storage = get_supabase().storage.from_(bucket)
    return ", ".join(f"{storage.get_public_url(path)} {width}w" for path, width in parts)


def pop_embedded_media_srcset(row: dict) -> str | None:
    """Same embedded-join pattern as `pop_embedded_media_url`, but resolves
    the full responsive `srcset` instead of just the canonical URL. Reads
    (doesn't pop) the `media` key — call this *before* `pop_embedded_media_url`
    on the same row, since that one pops `media` off and would leave nothing
    here to read."""
    media = row.get("media") or {}
    return responsive_srcset_for(media.get("bucket"), media.get("storage_path"))


def _sniff_image_type(raw: bytes) -> str:
    for magic, mime in _MAGIC_BYTES.items():
        if raw.startswith(magic):
            if magic == b"RIFF" and raw[8:12] != b"WEBP":
                continue
            return mime
    raise AppError(code="invalid_file", message="File is not a recognized image (checked by content, not extension).", status_code=422)


def _encode(img: Image.Image, fmt: str) -> bytes:
    buf = io.BytesIO()
    save_kwargs = {"quality": _ENCODE_QUALITY} if fmt in ("WEBP", "AVIF") else {}
    img.convert("RGB" if fmt in ("JPEG", "AVIF") else "RGBA" if img.mode == "RGBA" else "RGB").save(
        buf, format=fmt, **save_kwargs
    )
    return buf.getvalue()


async def process_and_store(
    file: UploadFile,
    bucket: str,
    alt_text: str | None,
    uploaded_by: str,
) -> tuple[dict, list[StoredVariant]]:
    if bucket not in _VALID_BUCKETS:
        raise AppError(code="invalid_bucket", message=f"Unknown storage bucket '{bucket}'.", status_code=422)

    raw = await file.read()
    max_bytes = get_settings().max_upload_bytes
    if len(raw) > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise AppError(
            code="file_too_large",
            message=f"Image is too large — please keep source files under {limit_mb}MB.",
            status_code=422,
        )

    # Everything below is either CPU-bound (Pillow decode/resize/encode, x3
    # breakpoints x up to 3 formats) or a blocking network call (up to 9
    # sequential Supabase Storage uploads) — run off the event loop so one
    # admin's upload can't stall every public request the single Uvicorn
    # worker is otherwise serving concurrently.
    return await asyncio.to_thread(_process_and_store_sync, raw, bucket, alt_text, uploaded_by)


def _process_and_store_sync(
    raw: bytes,
    bucket: str,
    alt_text: str | None,
    uploaded_by: str,
) -> tuple[dict, list[StoredVariant]]:
    _sniff_image_type(raw)  # raises if not a real image

    try:
        source = Image.open(io.BytesIO(raw))
        source.load()
    except Exception as exc:
        raise AppError(code="invalid_file", message="Could not decode image.", status_code=422) from exc

    if source.width * source.height > _MAX_PIXELS:
        raise AppError(code="file_too_large", message="Image dimensions are too large to process.", status_code=422)

    # Bakes the EXIF orientation tag into the pixel data itself (and strips
    # the tag) — without this, photos taken in portrait on a phone decode
    # sideways/upside-down everywhere downstream, since none of the resize/
    # encode steps below consult EXIF.
    source = ImageOps.exif_transpose(source)

    supabase = get_supabase()
    stem = uuid.uuid4().hex
    variants: list[StoredVariant] = []
    canonical_path = ""
    # Every object actually written to Storage during this call — tracked so
    # a failure partway through (a WebP/JPEG upload, or the final DB write)
    # can roll back everything already uploaded rather than leaving orphaned
    # variant files with no `media` row pointing at them.
    uploaded_paths: list[str] = []

    try:
        for label, max_width in _BREAKPOINTS.items():
            resized = source.copy()
            resized.thumbnail((max_width, max_width * 4), Image.LANCZOS)

            for fmt, ext, content_type in (("WEBP", "webp", "image/webp"), ("JPEG", "jpg", "image/jpeg")):
                encoded = _encode(resized, fmt)
                path = f"{stem}/{label}.{ext}"
                supabase.storage.from_(bucket).upload(
                    path, encoded, {"content-type": content_type, "cache-control": "31536000"}
                )
                uploaded_paths.append(path)
                public_url = supabase.storage.from_(bucket).get_public_url(path)
                variants.append(StoredVariant(url=public_url, width=resized.width, height=resized.height, format=fmt.lower()))
                if label == "lg" and fmt == "WEBP":
                    canonical_path = path

            try:
                avif_encoded = _encode(resized, "AVIF")
                avif_path = f"{stem}/{label}.avif"
                supabase.storage.from_(bucket).upload(
                    avif_path, avif_encoded, {"content-type": "image/avif", "cache-control": "31536000"}
                )
                uploaded_paths.append(avif_path)
                public_url = supabase.storage.from_(bucket).get_public_url(avif_path)
                variants.append(StoredVariant(url=public_url, width=resized.width, height=resized.height, format="avif"))
            except Exception:
                pass  # AVIF is best-effort; WebP/JPEG fallback above always succeeds — never rolled back for.

        media_row = media_repository.create(
            {
                "storage_path": canonical_path,
                "alt_text": alt_text,
                "width": source.width,
                "height": source.height,
                "bucket": bucket,
                "uploaded_by": uploaded_by,
            }
        )
    except Exception:
        if uploaded_paths:
            try:
                supabase.storage.from_(bucket).remove(uploaded_paths)
            except Exception as cleanup_exc:
                # Cleanup itself failing is logged, not raised — the original
                # error is what the caller needs to see; a dangling variant
                # left behind after a failed cleanup is a known, visible
                # tradeoff, not a silent one.
                logger.error(
                    f"Failed to roll back {len(uploaded_paths)} partially-uploaded variant(s) "
                    f"for stem={stem} bucket={bucket}: {cleanup_exc}"
                )
        raise

    return media_row, variants


def _variant_paths(storage_path: str) -> list[str]:
    """Every object `process_and_store` could have written for one upload —
    the 3 breakpoints x (WebP, JPEG, best-effort AVIF) — derived from the
    canonical `{stem}/lg.webp` path so this never drifts from the encode loop
    above. If `storage_path` isn't in that shape (unexpected/legacy row),
    falls back to just that one path rather than guessing."""
    if not storage_path.endswith("/lg.webp"):
        return [storage_path]
    stem = storage_path.removesuffix("/lg.webp")
    return [f"{stem}/{label}.{ext}" for label in _BREAKPOINTS for ext in ("webp", "jpg", "avif")]


def delete_image_variants(bucket: str | None, storage_path: str | None) -> None:
    """Storage-only counterpart to `delete_media`, for images tracked by raw
    (bucket, path) rather than a `media` row id — currently just the hero
    video poster, which `hero_background_repository` stores as bucket/path
    columns on `hero_backgrounds` instead of a `media_id` FK. Safe for both
    poster origins: a manually-uploaded poster went through
    `process_and_store` (so `path` is a `.../lg.webp` canonical path and
    `_variant_paths` expands it to all 9 variant files); an auto-extracted
    poster is a single raw JPEG (so `_variant_paths` falls back to just that
    one path). Best-effort — logs and returns on failure rather than raising,
    same contract as `delete_media`."""
    if not bucket or not storage_path:
        return
    try:
        get_supabase().storage.from_(bucket).remove(_variant_paths(storage_path))
    except Exception as exc:
        logger.error(f"Failed to delete Storage files at {bucket}/{storage_path} — left in place for manual cleanup: {exc}")


def delete_media(media_id: str | None) -> None:
    """Best-effort teardown of one `media` row and every Storage variant file
    it owns. Only ever called *after* the entity that referenced it has
    already been repointed at a different image (see
    `update_with_image_cleanup` below) — so a failure here can never leave an
    entity pointing at a missing image, only leave a harmless orphaned file/
    row behind. Storage removal is attempted first; the `media` row itself is
    only deleted once that succeeds, so a failed Storage delete leaves the
    row in place as a record of what still needs cleaning up, logged for a
    later manual/scripted sweep rather than silently lost."""
    if not media_id:
        return

    try:
        row = media_repository.get(media_id)
    except Exception as exc:
        logger.info(f"Nothing to clean up — media {media_id} is already gone: {exc}")
        return

    try:
        get_supabase().storage.from_(row["bucket"]).remove(_variant_paths(row["storage_path"]))
    except Exception as exc:
        logger.error(
            f"Failed to delete Storage files for replaced media {media_id} "
            f"(bucket={row.get('bucket')!r}, path={row.get('storage_path')!r}) — "
            f"left in place for manual cleanup: {exc}"
        )
        return

    try:
        media_repository.delete(media_id)
    except Exception as exc:
        logger.error(f"Storage files for media {media_id} were deleted but its `media` row could not be removed: {exc}")


def cleanup_replaced_image(old_media_id: str | None, new_media_id: str | None) -> None:
    """Deletes the previous image only when the reference genuinely changed
    to something else. A no-op PATCH that repeats the same id, or one that
    never touched the image field at all, must never delete anything —
    callers should only invoke this after their own DB update already
    committed the new reference."""
    if old_media_id and old_media_id != new_media_id:
        delete_media(old_media_id)


def update_with_image_cleanup(
    get_fn: Callable[[str], dict[str, Any]],
    update_fn: Callable[[str, dict[str, Any]], dict[str, Any]],
    entity_id: str,
    fields: dict[str, Any],
    image_field: str = "image_id",
) -> dict[str, Any]:
    """Shared "replace an entity's image" sequence for every admin PATCH
    endpoint whose row owns a single reference into the `media` table
    (`image_id` on categories/menu_items/specials/event_packages, `media_id`
    on gallery items): read the current reference, run the caller's normal
    update, and only once that update has actually committed does it delete
    the previous image's Storage files. If `update_fn` raises, nothing is
    deleted and the old image is untouched. If the Storage cleanup that
    follows a successful update then fails, it's logged and left for later —
    the entity update itself is never rolled back.
    """
    old_media_id = None
    if image_field in fields:
        try:
            old_media_id = get_fn(entity_id).get(image_field)
        except Exception:
            old_media_id = None

    updated = update_fn(entity_id, fields)

    if image_field in fields:
        cleanup_replaced_image(old_media_id, fields.get(image_field))

    return updated


def update_with_image_list_cleanup(
    get_fn: Callable[[str], dict[str, Any]],
    update_fn: Callable[[str, dict[str, Any]], dict[str, Any]],
    entity_id: str,
    fields: dict[str, Any],
    image_field: str = "image_ids",
) -> dict[str, Any]:
    """Same sequence as `update_with_image_cleanup`, for entities that own a
    *list* of image references (rooms.image_ids) rather than a single one —
    once the update has committed, deletes every id that was in the old list
    but is no longer in the new one. Ids still present in both (unchanged
    photos) are left untouched."""
    old_ids: list[str] = []
    if image_field in fields:
        try:
            old_ids = get_fn(entity_id).get(image_field) or []
        except Exception:
            old_ids = []

    updated = update_fn(entity_id, fields)

    if image_field in fields:
        new_ids = fields.get(image_field) or []
        for media_id in set(old_ids) - set(new_ids):
            delete_media(media_id)

    return updated
