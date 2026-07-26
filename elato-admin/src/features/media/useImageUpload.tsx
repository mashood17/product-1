import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mediaApi } from "../../api/resources";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../lib/query-client";
import { mediaQueryKey } from "./media-query-key";
import { ImageCropDialog } from "./ImageCropDialog";
import { matchesAspect, readImageDimensions } from "./crop-image";
import { BUCKET_MAX_BYTES, formatByteLimit } from "./upload-limits";
import type { DimensionSpec } from "./upload-specs";
import type { MediaBucket, MediaOut } from "../../types/api";

/**
 * Direct-to-device upload: opening the native file picker and uploading
 * whatever's selected immediately — no "browse previously uploaded images"
 * step anywhere in this flow. Shared by ImagePickerField,
 * MultiImagePickerField and SectionImageCard.
 *
 * When `spec` has a fixed aspect ratio and the selected image doesn't
 * already match it, a crop dialog opens before upload; the cropped export
 * then goes through the same size check and mutation as a direct match
 * would. Nothing about the upload/storage path itself changes.
 */
export function useImageUpload(bucket: MediaBucket, onUploaded: (media: MediaOut) => void, spec?: DimensionSpec) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [pendingCrop, setPendingCrop] = useState<{ file: File; imageSrc: string } | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (file: File) => {
      setProgress(0);
      return mediaApi.upload(file, bucket, file.name, setProgress);
    },
    onSuccess: (res) => {
      setProgress(null);
      void queryClient.invalidateQueries({ queryKey: mediaQueryKey(bucket) });
      onUploaded(res.media);
    },
    onError: (err) => {
      setProgress(null);
      showToast({ title: "Upload failed", description: errorMessage(err), variant: "error" });
    },
  });

  function open() {
    if (!mutation.isPending) inputRef.current?.click();
  }

  // Same size check as before the crop step existed — now the gate that
  // runs first, so an oversized file is rejected immediately and never gets
  // sent to the crop dialog. Reused as-is after cropping too, since the
  // cropped export goes through this exact same validation.
  function isWithinLimit(file: File): boolean {
    const maxBytes = BUCKET_MAX_BYTES[bucket];
    if (file.size > maxBytes) {
      showToast({
        title: "Image too large",
        description: `This category accepts images up to ${formatByteLimit(maxBytes)} — please resize and try again.`,
        variant: "error",
      });
      return false;
    }
    return true;
  }

  function closeCropDialog() {
    if (pendingCrop) URL.revokeObjectURL(pendingCrop.imageSrc);
    setPendingCrop(null);
  }

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isWithinLimit(file)) return;

    if (spec?.aspect != null) {
      try {
        const { width, height } = await readImageDimensions(file);
        if (!matchesAspect(width, height, spec.aspect)) {
          setPendingCrop({ file, imageSrc: URL.createObjectURL(file) });
          return;
        }
      } catch {
        // Couldn't probe dimensions (e.g. unsupported format) — fall through
        // to a direct upload and let the backend be the judge.
      }
    }

    mutation.mutate(file);
  }

  return {
    open,
    isUploading: mutation.isPending,
    progress,
    inputElement: (
      <>
        <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={handleChange} tabIndex={-1} />
        {pendingCrop && spec?.aspect != null && (
          <ImageCropDialog
            open
            imageSrc={pendingCrop.imageSrc}
            fileName={pendingCrop.file.name}
            mimeType={pendingCrop.file.type || "image/jpeg"}
            aspect={spec.aspect}
            onCancel={closeCropDialog}
            onCropped={(croppedFile) => {
              closeCropDialog();
              if (isWithinLimit(croppedFile)) mutation.mutate(croppedFile);
            }}
          />
        )}
      </>
    ),
  };
}
