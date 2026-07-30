import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Film, ImagePlus, Trash2, Eye } from "lucide-react";
import { heroBackgroundsApi } from "../../api/resources";
import { Button, Card, CardBody, CardHeader, ConfirmDialog, Modal, FileDropzone } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../lib/query-client";
import { HERO_BACKGROUNDS_QUERY_KEY } from "./hero-background-query-key";
import { UploadSpecHint } from "../media/UploadSpecHint";
import { ImageCropDialog } from "../media/ImageCropDialog";
import { matchesAspect, readImageDimensions, sniffImageFormat } from "../media/crop-image";
import { DIMENSION_SPECS } from "../media/upload-specs";
import { BUCKET_MAX_BYTES, HERO_VIDEO_MAX_BYTES } from "../media/upload-limits";
import type { DimensionSpec } from "../media/upload-specs";
import type { HeroBackgroundOut, HeroSlot } from "../../types/api";

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * One slot (desktop or mobile) of the admin-managed hero background — video
 * upload/replace/delete/preview plus a poster-image fallback for when
 * automatic poster extraction wasn't feasible for a given upload. Mirrors
 * SectionImageCard's direct-upload, no-gallery pattern, but for video: no
 * "Save" step, every action commits immediately.
 */
export function HeroVideoCard({
  slot,
  label,
  description,
  data,
}: {
  slot: HeroSlot;
  label: string;
  description: string;
  data?: HeroBackgroundOut;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [progress, setProgress] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingPosterCrop, setPendingPosterCrop] = useState<{ file: File; imageSrc: string } | null>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  // The hero video itself has no fixed-ratio recommendation shown here beyond
  // matching its poster's orientation — video never goes through the crop
  // flow (see requirement #3), so `aspect` stays null.
  const videoSpec: DimensionSpec =
    slot === "desktop"
      ? { width: 1920, height: 1080, aspectLabel: "16:9", aspect: null, formats: "MP4 (H.264)" }
      : { width: 1080, height: 1920, aspectLabel: "9:16", aspect: null, formats: "MP4 (H.264)" };
  const posterSpec = slot === "desktop" ? DIMENSION_SPECS.heroDesktop : DIMENSION_SPECS.heroMobile;

  // Same belt-and-suspenders unmount cleanup as useImageUpload — the cancel/
  // cropped handlers below already revoke on their own paths; this only
  // catches navigating away while the dialog is still open. Revoking an
  // already-revoked URL is a no-op, so this can't double-free.
  useEffect(() => {
    return () => {
      if (pendingPosterCrop) URL.revokeObjectURL(pendingPosterCrop.imageSrc);
    };
  }, [pendingPosterCrop]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: HERO_BACKGROUNDS_QUERY_KEY });

  const uploadVideoMutation = useMutation({
    mutationFn: (file: File) => {
      setProgress(0);
      return heroBackgroundsApi.uploadVideo(slot, file, setProgress);
    },
    onSuccess: () => {
      setProgress(null);
      showToast({ title: `${label} saved`, variant: "success" });
      invalidate();
    },
    onError: (err) => {
      setProgress(null);
      showToast({ title: "Upload failed", description: errorMessage(err), variant: "error" });
    },
  });

  const uploadPosterMutation = useMutation({
    mutationFn: (file: File) => heroBackgroundsApi.uploadPoster(slot, file),
    onSuccess: () => {
      showToast({ title: "Poster updated", variant: "success" });
      invalidate();
    },
    onError: (err) => showToast({ title: "Poster upload failed", description: errorMessage(err), variant: "error" }),
  });

  const removeMutation = useMutation({
    mutationFn: () => heroBackgroundsApi.remove(slot),
    onSuccess: () => {
      setConfirmDeleteOpen(false);
      showToast({ title: `${label} removed`, variant: "success" });
      invalidate();
    },
    onError: (err) => showToast({ title: "Couldn't remove", description: errorMessage(err), variant: "error" }),
  });

  const busy = uploadVideoMutation.isPending || uploadPosterMutation.isPending || removeMutation.isPending;

  return (
    <Card>
      <CardHeader
        title={label}
        description={description}
        actions={
          data && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Preview
            </Button>
          )
        }
      />
      <CardBody>
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex h-32 w-56 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-950">
            {data ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                key={data.video_url}
                src={data.video_url}
                poster={data.poster_url ?? undefined}
                muted
                loop
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <Film className="h-6 w-6 text-neutral-500" aria-hidden="true" />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <FileDropzone
              accept="video/mp4,video/webm"
              disabled={busy}
              hint={data ? "Replace — MP4 or WebM, under 25MB, 20s or shorter" : "MP4 or WebM, under 25MB, 20s or shorter"}
              onFileSelected={(file) => uploadVideoMutation.mutate(file)}
            />
            <UploadSpecHint maxBytes={HERO_VIDEO_MAX_BYTES} spec={videoSpec} />
            {progress !== null && <p className="text-xs text-neutral-400">Uploading — {progress}%</p>}

            {data && (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-500">
                  {data.width && data.height && (
                    <div>
                      <dt className="inline text-neutral-400">Resolution: </dt>
                      <dd className="inline">
                        {data.width}×{data.height}
                      </dd>
                    </div>
                  )}
                  {data.duration_seconds != null && (
                    <div>
                      <dt className="inline text-neutral-400">Duration: </dt>
                      <dd className="inline">{data.duration_seconds.toFixed(1)}s</dd>
                    </div>
                  )}
                  <div>
                    <dt className="inline text-neutral-400">Size: </dt>
                    <dd className="inline">{formatBytes(data.file_size_bytes)}</dd>
                  </div>
                  <div>
                    <dt className="inline text-neutral-400">Format: </dt>
                    <dd className="inline">{data.video_mime.replace("video/", "").toUpperCase()}</dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={posterInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;

                      const format = await sniffImageFormat(file);
                      if (format === "unsupported" || format === "heic") {
                        showToast({
                          title: "Unsupported image format",
                          description:
                            format === "heic"
                              ? "HEIC/HEIF photos aren't supported — export this photo as JPEG before uploading."
                              : "Please upload a JPEG, PNG, or WebP image.",
                          variant: "error",
                        });
                        return;
                      }

                      try {
                        const { width, height } = await readImageDimensions(file);
                        if (posterSpec.aspect != null && !matchesAspect(width, height, posterSpec.aspect)) {
                          setPendingPosterCrop({ file, imageSrc: URL.createObjectURL(file) });
                          return;
                        }
                      } catch {
                        // Couldn't probe dimensions — fall through to a direct upload.
                      }
                      uploadPosterMutation.mutate(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    isLoading={uploadPosterMutation.isPending}
                    onClick={() => posterInputRef.current?.click()}
                  >
                    <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                    {data.poster_url ? "Replace poster" : "Add poster"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmDeleteOpen(true)}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
                <UploadSpecHint maxBytes={BUCKET_MAX_BYTES.hero} spec={posterSpec} />
                {!data.poster_url && (
                  <p className="text-xs text-amber-600">
                    No poster could be auto-generated for this video — add one so the hero has an instant placeholder
                    before playback starts.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </CardBody>

      {data && (
        <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title={label} size="lg">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={data.video_url}
            poster={data.poster_url ?? undefined}
            controls
            autoPlay
            loop
            muted
            playsInline
            className="w-full rounded-lg"
          />
        </Modal>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`Remove ${label.toLowerCase()}?`}
        description="The public site will show no background video for this breakpoint until a new one is uploaded."
        confirmLabel="Remove"
        isLoading={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate()}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      {pendingPosterCrop && posterSpec.aspect != null && (
        <ImageCropDialog
          open
          imageSrc={pendingPosterCrop.imageSrc}
          fileName={pendingPosterCrop.file.name}
          mimeType={pendingPosterCrop.file.type || "image/jpeg"}
          aspect={posterSpec.aspect}
          maxBytes={BUCKET_MAX_BYTES.hero}
          maxWidth={posterSpec.width}
          maxHeight={posterSpec.height}
          onCancel={() => {
            URL.revokeObjectURL(pendingPosterCrop.imageSrc);
            setPendingPosterCrop(null);
          }}
          onCropped={(croppedFile) => {
            URL.revokeObjectURL(pendingPosterCrop.imageSrc);
            setPendingPosterCrop(null);
            uploadPosterMutation.mutate(croppedFile);
          }}
        />
      )}
    </Card>
  );
}
