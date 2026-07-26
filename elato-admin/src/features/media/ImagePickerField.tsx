import { useQuery } from "@tanstack/react-query";
import { ImagePlus, X } from "lucide-react";
import { mediaApi } from "../../api/resources";
import { mediaQueryKey } from "./media-query-key";
import { useImageUpload } from "./useImageUpload";
import { UploadSpecHint } from "./UploadSpecHint";
import { BUCKET_MAX_BYTES } from "./upload-limits";
import { Button, FieldShell } from "../../components/ui";
import type { DimensionSpec } from "./upload-specs";
import type { MediaBucket } from "../../types/api";

/**
 * Single-image field: shows the current selection's thumbnail. "Add Image" /
 * "Replace" opens the device file picker immediately and uploads on
 * selection — there's no picker grid of previously-uploaded images. There's
 * no `GET /admin/media/{id}` endpoint on the backend, so resolving `imageId`
 * to a thumbnail works by matching it against the bucket's list (capped at
 * 100 items, the API's page-size ceiling) — good enough for these per-bucket
 * asset counts.
 */
export function ImagePickerField({
  label,
  bucket,
  imageId,
  onChange,
  spec,
}: {
  label?: string;
  bucket: MediaBucket;
  imageId: string | null;
  onChange: (mediaId: string | null) => void;
  spec?: DimensionSpec;
}) {
  const { data } = useQuery({
    queryKey: mediaQueryKey(bucket),
    queryFn: () => mediaApi.list({ bucket, limit: 100 }),
  });

  const current = imageId ? data?.items.find((m) => m.id === imageId) : undefined;
  const { open, isUploading, progress, inputElement } = useImageUpload(bucket, (media) => onChange(media.id), spec);

  return (
    <FieldShell label={label}>
      {inputElement}
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
          {current ? (
            <img src={current.url} alt={current.alt_text ?? ""} className="h-full w-full object-cover" />
          ) : imageId ? (
            <span className="px-1 text-center text-[10px] text-neutral-400">Selected</span>
          ) : (
            <ImagePlus className="h-5 w-5 text-neutral-300" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={open} isLoading={isUploading}>
              {imageId ? "Replace" : "Add Image"}
            </Button>
            {imageId && !isUploading && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                <X className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
          </div>
          {isUploading && (
            <p className="text-xs text-neutral-400">Uploading{progress !== null ? ` — ${progress}%` : "…"}</p>
          )}
          {spec && !isUploading && <UploadSpecHint maxBytes={BUCKET_MAX_BYTES[bucket]} spec={spec} />}
        </div>
      </div>
    </FieldShell>
  );
}
