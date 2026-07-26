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

/** Crops `imageSrc` to `cropPixels` and re-encodes as a File, preserving the original name/type. */
export async function getCroppedImageFile(imageSrc: string, cropPixels: PixelCrop, fileName: string, mimeType: string): Promise<File> {
  const img = new Image();
  img.src = imageSrc;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Couldn't load image for cropping."));
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cropPixels.width);
  canvas.height = Math.round(cropPixels.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't supported in this browser.");

  ctx.drawImage(
    img,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.92));
  if (!blob) throw new Error("Couldn't export the cropped image.");
  return new File([blob], fileName, { type: mimeType });
}
