import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mediaApi } from "../../api/resources";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../lib/query-client";
import { mediaQueryKey } from "./media-query-key";
import type { MediaBucket, MediaOut } from "../../types/api";

// Mirrors the server-side per-bucket caps in
// elato-backend/app/services/media_service.py's `_BUCKET_MAX_BYTES` — kept
// in sync manually since the two apps don't share a build. Purely a UX
// shortcut: rejecting an oversized file here saves the round-trip to the
// server, which enforces the same limit regardless.
const BUCKET_MAX_BYTES: Record<MediaBucket, number> = {
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

function formatLimit(maxBytes: number): string {
  return maxBytes < 1024 * 1024 ? `${Math.round(maxBytes / 1024)}KB` : `${Math.round(maxBytes / (1024 * 1024))}MB`;
}

/**
 * Direct-to-device upload: opening the native file picker and uploading
 * whatever's selected immediately — no "browse previously uploaded images"
 * step anywhere in this flow. Shared by ImagePickerField,
 * MultiImagePickerField and SectionImageCard.
 */
export function useImageUpload(bucket: MediaBucket, onUploaded: (media: MediaOut) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
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

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const maxBytes = BUCKET_MAX_BYTES[bucket];
      if (file.size > maxBytes) {
        showToast({
          title: "Image too large",
          description: `This category accepts images up to ${formatLimit(maxBytes)} — please resize and try again.`,
          variant: "error",
        });
      } else {
        mutation.mutate(file);
      }
    }
    e.target.value = "";
  }

  return {
    open,
    isUploading: mutation.isPending,
    progress,
    inputElement: (
      <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={handleChange} tabIndex={-1} />
    ),
  };
}
