from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.dependencies import CurrentAdmin, get_current_admin, require_role
from app.repositories import media_repository
from app.schemas.common import Page, PaginationParams
from app.schemas.media import MediaOut, MediaUploadResponse, MediaVariant
from app.services import media_service, r2_storage

router = APIRouter(prefix="/admin/media", tags=["admin-media"])


@router.get("", response_model=Page[MediaOut])
def list_media(
    bucket: str | None = None,
    pagination: PaginationParams = Depends(),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    rows, total = media_repository.list_all(pagination.limit, pagination.offset, bucket)
    items = [_to_media_out(r) for r in rows]
    return Page(items=items, total=total, limit=pagination.limit, offset=pagination.offset)


@router.post("/upload", response_model=MediaUploadResponse, status_code=201)
async def upload_media(
    bucket: str = Form(...),
    alt_text: str | None = Form(default=None),
    file: UploadFile = File(...),
    admin: CurrentAdmin = Depends(require_role("owner", "admin", "editor")),
):
    media_row, variants = await media_service.process_and_store(file, bucket, alt_text, admin.id)
    return MediaUploadResponse(
        media=_to_media_out(media_row),
        variants=[MediaVariant(url=v.url, width=v.width, height=v.height, format=v.format) for v in variants],
    )


@router.delete("/{media_id}", status_code=204)
def delete_media(media_id: str, admin: CurrentAdmin = Depends(require_role("owner", "admin"))):
    media_service.delete_media(media_id)


def _to_media_out(row: dict) -> MediaOut:
    url = r2_storage.public_url(row["bucket"], row["storage_path"])
    return MediaOut(**row, url=url)
