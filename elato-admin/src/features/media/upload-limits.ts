import type { MediaBucket } from "../../types/api";

// Mirrors the server-side per-bucket caps in
// elato-backend/app/services/media_service.py's `_BUCKET_MAX_BYTES` — kept
// in sync manually since the two apps don't share a build. Single source of
// truth for both the client-side pre-check in useImageUpload and the
// "Required: Max …" line shown on every upload field.
export const BUCKET_MAX_BYTES: Record<MediaBucket, number> = {
  hero: 3 * 1024 * 1024,
  gallery: 1 * 1024 * 1024,
  menu: 512 * 1024,
  categories: 512 * 1024,
  reviews: 512 * 1024,
  logos: 1 * 1024 * 1024,
  "public-assets": 1 * 1024 * 1024,
  events: 1 * 1024 * 1024,
  stay: 1 * 1024 * 1024,
  uploads: 1 * 1024 * 1024,
};

// Mirrors elato-backend/app/core/config.py's `hero_video_max_bytes` default
// (HERO_VIDEO_MAX_BYTES env var) — the cap hero_video_service.py enforces.
export const HERO_VIDEO_MAX_BYTES = 25 * 1024 * 1024;

// Mirrors elato-backend/app/services/video_gallery_service.py's `MAX_BYTES`.
export const VIDEO_GALLERY_MAX_BYTES = 30 * 1024 * 1024;

export function formatByteLimit(maxBytes: number): string {
  return maxBytes < 1024 * 1024 ? `${Math.round(maxBytes / 1024)} KB` : `${Math.round(maxBytes / (1024 * 1024))} MB`;
}
