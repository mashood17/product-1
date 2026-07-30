"""
Shared size-tolerance margins for every upload enforcement point (images and
videos, across media_service/hero_video_service/video_gallery_service). A
configured cap like "512KB" is a target admins are asked to stay near, not a
byte-exact boundary — legitimate encoding noise (a different JPEG/WebP
encoder's quantization tables, container/muxer overhead, filesystem block
rounding) can land an upload a few KB over the advertised number without it
actually being "too large" in any meaningful sense. Every enforcement point
adds this margin on top of the advertised limit rather than comparing raw
byte counts; the advertised limit itself is still what error messages quote,
so admins see a stable, meaningful number rather than a fudge-padded one.

Mirrored on the frontend in elato-admin/src/features/media/upload-limits.ts
(the two apps don't share a build, so this is kept in sync manually, same as
the byte caps themselves).
"""

IMAGE_SIZE_TOLERANCE_BYTES = 20 * 1024
VIDEO_SIZE_TOLERANCE_BYTES = 1 * 1024 * 1024


def image_budget(max_bytes: int) -> int:
    """The real accept threshold for an image bucket's advertised cap."""
    return max_bytes + IMAGE_SIZE_TOLERANCE_BYTES


def video_budget(max_bytes: int) -> int:
    """The real accept threshold for a video cap's advertised limit."""
    return max_bytes + VIDEO_SIZE_TOLERANCE_BYTES
