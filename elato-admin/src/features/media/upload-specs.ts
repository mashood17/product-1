/**
 * Recommended (not enforced) dimensions/aspect ratio shown to admins before
 * they upload an asset, plus the aspect ratio used to decide whether the
 * crop dialog opens. The actual size limit is never invented here — it's
 * read from the real per-bucket/video caps in upload-limits.ts.
 */
export interface DimensionSpec {
  /** Pixel width. For flexible-ratio assets this is the only fixed dimension. */
  width: number;
  /** Pixel height. Omitted for flexible-ratio assets (width-only guidance). */
  height?: number;
  /** Label shown for the ratio, e.g. "16:9" or "Flexible aspect ratio". */
  aspectLabel: string;
  /** width / height for crop purposes. `null` = no fixed ratio, so no crop step. */
  aspect: number | null;
  /** Formats line, e.g. "JPG, PNG, WebP" or "MP4 (H.264)". */
  formats: string;
}

const IMAGE_FORMATS = "JPG, PNG, WebP";

export const DIMENSION_SPECS = {
  heroDesktop: { width: 1920, height: 1080, aspectLabel: "16:9", aspect: 16 / 9, formats: IMAGE_FORMATS },
  heroMobile: { width: 1080, height: 1920, aspectLabel: "9:16", aspect: 9 / 16, formats: IMAGE_FORMATS },
  section: { width: 1600, height: 1200, aspectLabel: "4:3", aspect: 4 / 3, formats: IMAGE_FORMATS },
  gallery: { width: 1600, height: 1200, aspectLabel: "4:3", aspect: 4 / 3, formats: IMAGE_FORMATS },
  stay: { width: 1600, height: 900, aspectLabel: "16:9", aspect: 16 / 9, formats: IMAGE_FORMATS },
  event: { width: 1600, height: 900, aspectLabel: "16:9", aspect: 16 / 9, formats: IMAGE_FORMATS },
  menuItem: { width: 1200, height: 1200, aspectLabel: "1:1", aspect: 1, formats: IMAGE_FORMATS },
  category: { width: 1200, height: 1200, aspectLabel: "1:1", aspect: 1, formats: IMAGE_FORMATS },
  specialItem: { width: 1200, height: 1200, aspectLabel: "1:1", aspect: 1, formats: IMAGE_FORMATS },
  review: { width: 600, height: 600, aspectLabel: "1:1", aspect: 1, formats: IMAGE_FORMATS },
  publicAsset: { width: 1920, aspectLabel: "Flexible aspect ratio", aspect: null, formats: IMAGE_FORMATS },
} as const satisfies Record<string, DimensionSpec>;

export type DimensionSpecKey = keyof typeof DIMENSION_SPECS;
