import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Trash2 } from "lucide-react";
import { videoGalleryApi } from "../../api/resources";
import { Button, Card, CardBody, ConfirmDialog, Input } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../lib/query-client";
import { formatDateTime } from "../../lib/utils";
import { VIDEO_GALLERY_QUERY_KEY } from "./video-gallery-query-key";
import { UploadSpecHint } from "../media/UploadSpecHint";
import { VIDEO_GALLERY_MAX_BYTES } from "../media/upload-limits";
import type { DimensionSpec } from "../media/upload-specs";
import type { VideoGalleryOut } from "../../types/api";

const SHOWCASE_VIDEO_SPEC: DimensionSpec = { width: 1080, height: 1920, aspectLabel: "9:16", aspect: null, formats: "MP4 (H.264)" };

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** One uploaded showcase video — preview, editable caption/Instagram link,
 * upload date, replace, delete. Replacing the file keeps this row's
 * position in the newest-first list unchanged (see
 * video_gallery_service.replace_video_file) — only a genuinely new upload
 * from VideoGalleryPage can evict the oldest video. */
export function VideoGalleryCard({ video }: { video: VideoGalleryOut }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [caption, setCaption] = useState(video.caption ?? "");
  const [instagramUrl, setInstagramUrl] = useState(video.instagram_url ?? "");
  const [replaceProgress, setReplaceProgress] = useState<number | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: VIDEO_GALLERY_QUERY_KEY });

  const dirty = caption !== (video.caption ?? "") || instagramUrl !== (video.instagram_url ?? "");

  const saveDetailsMutation = useMutation({
    mutationFn: () => videoGalleryApi.updateDetails(video.id, { caption: caption || null, instagram_url: instagramUrl || null }),
    onSuccess: (updated) => {
      showToast({ title: "Details saved", variant: "success" });
      // A non-instagram.com link is silently dropped server-side — reflect
      // that back into the field immediately rather than waiting on refetch.
      setInstagramUrl(updated.instagram_url ?? "");
      void invalidate();
    },
    onError: (err) => showToast({ title: "Couldn't save details", description: errorMessage(err), variant: "error" }),
  });

  const replaceMutation = useMutation({
    mutationFn: (file: File) => {
      setReplaceProgress(0);
      return videoGalleryApi.replaceVideo(video.id, file, setReplaceProgress);
    },
    onSuccess: () => {
      setReplaceProgress(null);
      showToast({ title: "Video replaced", variant: "success" });
      void invalidate();
    },
    onError: (err) => {
      setReplaceProgress(null);
      showToast({ title: "Replace failed", description: errorMessage(err), variant: "error" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => videoGalleryApi.remove(video.id),
    onSuccess: () => {
      setConfirmDeleteOpen(false);
      showToast({ title: "Video removed", variant: "success" });
      void invalidate();
    },
    onError: (err) => showToast({ title: "Couldn't remove", description: errorMessage(err), variant: "error" }),
  });

  const busy = saveDetailsMutation.isPending || replaceMutation.isPending || removeMutation.isPending;

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div className="aspect-[9/16] w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-950">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video key={video.video_url} src={video.video_url} muted loop autoPlay playsInline className="h-full w-full object-cover" />
        </div>

        <Input
          label="Caption"
          placeholder="A short caption for this clip"
          value={caption}
          disabled={busy}
          onChange={(e) => setCaption(e.target.value)}
        />
        <Input
          label="Instagram URL"
          placeholder="https://www.instagram.com/…"
          value={instagramUrl}
          disabled={busy}
          onChange={(e) => setInstagramUrl(e.target.value)}
          hint="Only instagram.com links are kept — anything else falls back to the ELATŌ profile on the public site."
        />
        {dirty && (
          <Button size="sm" variant="outline" isLoading={saveDetailsMutation.isPending} onClick={() => saveDetailsMutation.mutate()}>
            Save details
          </Button>
        )}

        <p className="text-xs text-neutral-400">
          Uploaded {formatDateTime(video.created_at)} · {formatBytes(video.file_size_bytes)} · {video.video_mime.replace("video/", "").toUpperCase()}
        </p>

        <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
          <input
            ref={replaceInputRef}
            type="file"
            accept="video/mp4,video/webm"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) replaceMutation.mutate(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            isLoading={replaceMutation.isPending}
            onClick={() => replaceInputRef.current?.click()}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Replace
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete
          </Button>
        </div>
        <UploadSpecHint maxBytes={VIDEO_GALLERY_MAX_BYTES} spec={SHOWCASE_VIDEO_SPEC} />
        {replaceProgress !== null && <p className="text-xs text-neutral-400">Uploading — {replaceProgress}%</p>}
      </CardBody>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Remove this video?"
        description="It will disappear from the public homepage immediately. This can't be undone."
        confirmLabel="Remove"
        isLoading={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate()}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </Card>
  );
}
