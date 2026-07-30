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

// Absorbs harmless encoding noise (a different JPEG/WebP encoder's
// quantization tables, container/muxer overhead, filesystem block rounding)
// so a configured "512 KB" cap doesn't reject an upload that's functionally
// the same size. Every validation path — this file's own budget helpers
// below, and the mirrored constants in
// elato-backend/app/core/upload_tolerance.py — applies this on top of the
// advertised limit rather than comparing against it byte-for-byte.
export const IMAGE_SIZE_TOLERANCE_BYTES = 20 * 1024;
export const VIDEO_SIZE_TOLERANCE_BYTES = 1 * 1024 * 1024;

/** The real accept threshold for an image bucket's advertised limit. */
export function imageUploadBudget(maxBytes: number): number {
  return maxBytes + IMAGE_SIZE_TOLERANCE_BYTES;
}

/** The real accept threshold for a video limit's advertised limit. */
export function videoUploadBudget(maxBytes: number): number {
  return maxBytes + VIDEO_SIZE_TOLERANCE_BYTES;
}

export function formatByteLimit(maxBytes: number): string {
  return maxBytes < 1024 * 1024 ? `${Math.round(maxBytes / 1024)} KB` : `${Math.round(maxBytes / (1024 * 1024))} MB`;
}
