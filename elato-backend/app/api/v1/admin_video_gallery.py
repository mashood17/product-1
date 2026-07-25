"""Admin-managed video showcase — up to five clips, each with an optional
caption and Instagram link, shown on the public homepage in place of the
removed Instagram feed. See app/services/video_gallery_service.py for the
upload/validation/eviction rules."""

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.dependencies import CurrentAdmin, get_current_admin, require_role
from app.repositories import video_gallery_repository
from app.schemas.video_gallery import VideoGalleryOut, VideoGalleryUpdate
from app.services import video_gallery_service

router = APIRouter(prefix="/admin/video-gallery", tags=["admin-video-gallery"])


@router.get("", response_model=list[VideoGalleryOut])
def list_videos(admin: CurrentAdmin = Depends(get_current_admin)):
    return [video_gallery_service.to_schema(row) for row in video_gallery_repository.list_all()]


@router.post("", response_model=VideoGalleryOut, status_code=201)
async def create_video(
    file: UploadFile = File(...),
    caption: str | None = Form(default=None),
    instagram_url: str | None = Form(default=None),
    admin: CurrentAdmin = Depends(require_role("owner", "admin", "editor")),
):
    row = await video_gallery_service.upload_video(file, caption, instagram_url, admin.id)
    return video_gallery_service.to_schema(row)


@router.patch("/{video_id}", response_model=VideoGalleryOut)
def update_video(
    video_id: str,
    payload: VideoGalleryUpdate,
    admin: CurrentAdmin = Depends(require_role("owner", "admin", "editor")),
):
    row = video_gallery_service.update_details(video_id, payload.model_dump(exclude_unset=True))
    return video_gallery_service.to_schema(row)


@router.post("/{video_id}/video", response_model=VideoGalleryOut)
async def replace_video(
    video_id: str,
    file: UploadFile = File(...),
    admin: CurrentAdmin = Depends(require_role("owner", "admin", "editor")),
):
    row = await video_gallery_service.replace_video_file(video_id, file)
    return video_gallery_service.to_schema(row)


@router.delete("/{video_id}", status_code=204)
def delete_video(video_id: str, admin: CurrentAdmin = Depends(require_role("owner", "admin"))):
    video_gallery_service.delete_video(video_id)
