export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Reads natural pixel dimensions of an image file without touching the DOM tree. */
export function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read image dimensions."));
    };
    img.src = url;
  });
}

/** Whether width/height already match the target aspect ratio closely enough to skip cropping. */
export function matchesAspect(width: number, height: number, targetAspect: number, tolerance = 0.02): boolean {
  const actual = width / height;
  return Math.abs(actual - targetAspect) / targetAspect <= tolerance;
}

const _JPEG_MAGIC = [0xff, 0xd8, 0xff];
const _PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const _RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46]; // "RIFF" — WEBP container
const _WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50]; // "WEBP", at offset 8 inside a RIFF container
const _HEIC_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx", "hevm", "hevs", "mif1", "msf1"]);

export type SniffedImageFormat = "jpeg" | "png" | "webp" | "heic" | "unsupported";

function matchesMagic(bytes: Uint8Array, magic: number[], offset = 0): boolean {
  return magic.every((byte, i) => bytes[offset + i] === byte);
}

/**
 * Identifies the real image format from its content (magic bytes), never the
 * filename/extension or the browser-reported `file.type` — mirrors the
 * backend's own sniff in media_service.py's `_sniff_image_type`, so the two
 * apps agree on what a supported upload looks like. This pipeline only ever
 * accepts JPEG/PNG/WebP as *source* formats (AVIF is generated for delivery,
 * never accepted as an upload; there's no GIF/SVG/HEIC handling anywhere in
 * the backend). Used to reject the rest immediately — before wasting a crop
 * dialog or an upload round-trip on a file that was always going to bounce.
 */
export async function sniffImageFormat(file: File): Promise<SniffedImageFormat> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (matchesMagic(head, _JPEG_MAGIC)) return "jpeg";
  if (matchesMagic(head, _PNG_MAGIC)) return "png";
  if (matchesMagic(head, _RIFF_MAGIC) && matchesMagic(head, _WEBP_MAGIC, 8)) return "webp";
  if (matchesMagic(head, [0x66, 0x74, 0x79, 0x70], 4)) {
    // ISO base media container (`....ftyp<brand>`) — HEIC/HEIF/AVIF all live
    // here; only the brand string tells them apart.
    const brand = new TextDecoder().decode(head.slice(8, 12)).toLowerCase();
    if (_HEIC_BRANDS.has(brand)) return "heic";
  }
  return "unsupported";
}

// Re-encode quality ladder: starts near-lossless and only steps down if the
// export lands over budget. A canvas re-encode of an already-compressed
// photo at a fixed high quality (the old behaviour: always 0.92) routinely
// comes out *larger* than the original — the source may have been saved by
// a smarter encoder at a lower effective quality, and the crop step was
// rejecting those exports outright with nowhere to go but "resize it
// yourself". Stepping down here is what makes that automatic. 0.5 is a
// deliberate floor — below that JPEG/WebP artifacts become visible, so a
// crop that still doesn't fit at 0.5 is rejected rather than degraded further.
const QUALITY_STEPS = [0.92, 0.85, 0.78, 0.7, 0.6, 0.5];

// Lossless formats (PNG-with-transparency) have no quality knob, so the only
// lever left when an export is over budget is dimensions — each step shrinks
// the *current* size further, compounding.
const PNG_SCALE_STEPS = [0.85, 0.7, 0.55, 0.4];

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Couldn't export the cropped image."));
    }, type, quality);
  });
}

/** Whether the cropped region actually contains any transparent pixels —
 * checked by sampling the canvas's alpha channel rather than trusting the
 * source's mime type, since a PNG source cropped down to an opaque region
 * shouldn't force a lossless (and much larger) PNG export. */
function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

// Whether this browser's canvas encoder actually honors "image/webp" (some
// older engines silently re-encode as PNG instead). Checked once per page
// load and cached — the answer can't change mid-session, so there's no
// reason to spend an extra encode probing it on every single crop.
let _webpSupported: boolean | null = null;
async function supportsWebpEncode(canvas: HTMLCanvasElement): Promise<boolean> {
  if (_webpSupported === null) {
    const probe = await canvasToBlob(canvas, "image/webp", 0.8);
    _webpSupported = probe.type === "image/webp";
  }
  return _webpSupported;
}

/** Picks the export format: PNG only when transparency is actually in use
 * (lossless is the point there, size isn't); otherwise WebP, since it beats
 * JPEG at equal visual quality — falling back to JPEG when the browser can't
 * actually encode WebP via canvas. */
async function chooseOutputFormat(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, sourceMimeType: string): Promise<string> {
  if (sourceMimeType === "image/png" && hasTransparency(ctx, canvas.width, canvas.height)) {
    return "image/png";
  }
  return (await supportsWebpEncode(canvas)) ? "image/webp" : "image/jpeg";
}

function renameForFormat(fileName: string, mimeType: string): string {
  const ext = mimeType === "image/webp" ? "webp" : mimeType === "image/png" ? "png" : "jpg";
  const stem = fileName.replace(/\.[^./\\]+$/, "");
  return `${stem}.${ext}`;
}

function renderCrop(
  img: HTMLImageElement,
  cropPixels: PixelCrop,
  outWidth: number,
  outHeight: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't supported in this browser.");
  ctx.drawImage(img, cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height, 0, 0, outWidth, outHeight);
  return { canvas, ctx };
}

/**
 * Crops `imageSrc` to `cropPixels` and re-encodes as a File targeting
 * `maxBytes` (the destination bucket's upload budget, tolerance included).
 *
 * `maxWidth`/`maxHeight`, when given, cap the *output* pixel dimensions to
 * the field's recommended size — never upscaled, only ever scaled down when
 * the crop selection is larger. This runs before any quality reduction: a
 * 20MP phone photo cropped down to a 1200x1200 recommendation shouldn't have
 * to fight for a byte budget at low quality across 17 million redundant
 * pixels the backend was always going to downsize anyway.
 *
 * Quality (or, for lossless PNG, dimensions again) only steps down as far as
 * needed to fit — an export that already fits at the first attempt is
 * returned as-is, so a typical crop costs exactly one encode.
 */
export async function getCroppedImageFile(
  imageSrc: string,
  cropPixels: PixelCrop,
  fileName: string,
  mimeType: string,
  maxBytes: number,
  maxWidth?: number,
  maxHeight?: number,
): Promise<File> {
  const img = new Image();
  img.src = imageSrc;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Couldn't load image for cropping."));
  });

  const scale = maxWidth && maxHeight ? Math.min(1, maxWidth / cropPixels.width, maxHeight / cropPixels.height) : 1;
  let outWidth = Math.max(1, Math.round(cropPixels.width * scale));
  let outHeight = Math.max(1, Math.round(cropPixels.height * scale));

  let { canvas, ctx } = renderCrop(img, cropPixels, outWidth, outHeight);

  const outputType = await chooseOutputFormat(canvas, ctx, mimeType);
  const outputName = renameForFormat(fileName, outputType);

  if (outputType === "image/png") {
    let blob = await canvasToBlob(canvas, outputType);
    for (let i = 0; i < PNG_SCALE_STEPS.length && blob.size > maxBytes; i++) {
      outWidth = Math.max(1, Math.round(outWidth * PNG_SCALE_STEPS[i]));
      outHeight = Math.max(1, Math.round(outHeight * PNG_SCALE_STEPS[i]));
      ({ canvas } = renderCrop(img, cropPixels, outWidth, outHeight));
      blob = await canvasToBlob(canvas, outputType);
    }
    return new File([blob], outputName, { type: outputType });
  }

  let blob = await canvasToBlob(canvas, outputType, QUALITY_STEPS[0]);
  for (const quality of QUALITY_STEPS.slice(1)) {
    if (blob.size <= maxBytes) break;
    blob = await canvasToBlob(canvas, outputType, quality);
  }

  return new File([blob], outputName, { type: outputType });
}
