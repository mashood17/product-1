import { useQuery } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { mediaApi } from "../../api/resources";
import { mediaQueryKey } from "../media/media-query-key";
import { useImageUpload } from "../media/useImageUpload";
import { UploadSpecHint } from "../media/UploadSpecHint";
import { BUCKET_MAX_BYTES } from "../media/upload-limits";
import { Button, Card, CardBody, CardHeader } from "../../components/ui";
import type { DimensionSpec } from "../media/upload-specs";
import type { MediaBucket } from "../../types/api";

interface SectionImageValue {
  media_id?: string;
  url?: string;
}

function isSectionImageValue(value: unknown): value is SectionImageValue {
  return typeof value === "object" && value !== null;
}

/**
 * A single hero/CTA image slot backed by one `site_content` key (freeform
 * jsonb `{ media_id, url }`) — used for the Services/About images on
 * Homepage and the section images on Stay/Events. Direct upload only: no
 * grid of previously-uploaded images, and it saves itself immediately on
 * upload/remove rather than needing a separate "Save" click.
 */
export function SectionImageCard({
  label,
  description,
  bucket = "hero",
  value,
  onSave,
  isSaving,
  spec,
}: {
  label: string;
  description?: string;
  bucket?: MediaBucket;
  value: unknown;
  onSave: (image: { media_id: string; url: string } | null) => void;
  isSaving?: boolean;
  spec?: DimensionSpec;
}) {
  const parsed = isSectionImageValue(value) ? value : undefined;
  const mediaId = parsed?.media_id ?? null;

  const { data } = useQuery({
    queryKey: mediaQueryKey(bucket),
    queryFn: () => mediaApi.list({ bucket, limit: 100 }),
    enabled: !!mediaId && !parsed?.url,
  });
  const resolvedUrl = parsed?.url ?? (mediaId ? data?.items.find((m) => m.id === mediaId)?.url : undefined);

  const { open, isUploading, progress, inputElement } = useImageUpload(
    bucket,
    (media) => onSave({ media_id: media.id, url: media.url }),
    spec,
  );
  const busy = isUploading || isSaving;

  return (
    <Card>
      <CardHeader title={label} description={description} />
      <CardBody>
        {inputElement}
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
            {resolvedUrl ? (
              <img src={resolvedUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-5 w-5 text-neutral-300" />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={open} isLoading={busy}>
                {mediaId ? "Replace" : "Add Image"}
              </Button>
              {mediaId && !busy && (
                <Button type="button" variant="ghost" size="sm" onClick={() => onSave(null)}>
                  Remove
                </Button>
              )}

            </div>
            {isUploading && (
              <p className="text-xs text-neutral-400">Uploading{progress !== null ? ` — ${progress}%` : "…"}</p>
            )}
            {spec && !isUploading && <UploadSpecHint maxBytes={BUCKET_MAX_BYTES[bucket]} spec={spec} />}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
