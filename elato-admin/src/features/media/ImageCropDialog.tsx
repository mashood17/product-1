import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Button, Modal } from "../../components/ui";
import { getCroppedImageFile, type PixelCrop } from "./crop-image";

/**
 * Pre-upload crop step, shown only when a selected image doesn't already
 * match the field's recommended aspect ratio. Reposition/zoom, then export a
 * single cropped file at that ratio and hand it back to the existing upload
 * flow — nothing about the upload/storage path changes.
 */
export function ImageCropDialog({
  open,
  imageSrc,
  fileName,
  mimeType,
  aspect,
  onCancel,
  onCropped,
}: {
  open: boolean;
  imageSrc: string;
  fileName: string;
  mimeType: string;
  aspect: number;
  onCancel: () => void;
  onCropped: (file: File) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleUsePhoto() {
    if (!croppedAreaPixels) return;
    setIsExporting(true);
    try {
      const cropped: PixelCrop = croppedAreaPixels;
      const file = await getCroppedImageFile(imageSrc, cropped, fileName, mimeType);
      onCropped(file);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Crop image"
      description="Reposition and zoom to fit the recommended frame."
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" isLoading={isExporting} onClick={handleUsePhoto}>
            Use photo
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="relative h-80 w-full overflow-hidden rounded-lg bg-neutral-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-neutral-700">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-accent-600"
          />
        </label>
      </div>
    </Modal>
  );
}
