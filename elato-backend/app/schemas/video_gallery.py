from pydantic import BaseModel


class VideoGalleryOut(BaseModel):
    id: str
    video_url: str
    video_mime: str
    file_size_bytes: int
    caption: str | None = None
    instagram_url: str | None = None
    created_at: str


class VideoGalleryUpdate(BaseModel):
    """Both fields optional and independently omittable — only keys present
    in the request body are applied (see admin_video_gallery.update_video's
    `exclude_unset=True`), so a caption-only edit never touches
    instagram_url and vice versa."""

    caption: str | None = None
    instagram_url: str | None = None
