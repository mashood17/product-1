import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Film, Plus, RefreshCw } from "lucide-react";
import { videoGalleryApi } from "../../api/resources";
import {
  Button,
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  FileDropzone,
  Input,
  Modal,
  PageHeader,
} from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../lib/query-client";
import { VIDEO_GALLERY_QUERY_KEY } from "./video-gallery-query-key";
import { VideoGalleryCard } from "./VideoGalleryCard";

const MAX_VIDEOS = 5;

export function VideoGalleryPage() {
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: VIDEO_GALLERY_QUERY_KEY,
    queryFn: videoGalleryApi.list,
  });

  const videos = data ?? [];

  return (
    <div>
      <PageHeader
        title="Video Showcase"
        description={`Up to ${MAX_VIDEOS} clips shown on the public homepage, newest first. Uploading a new video once ${MAX_VIDEOS} already exist automatically retires the oldest one.`}
        actions={
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Upload video
          </Button>
        }
      />

      {isError ? (
        <ErrorState description={errorMessage(error)} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <CardGridSkeleton count={3} />
      ) : videos.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No videos yet"
          description="Upload up to five clips to power the homepage video showcase."
          action={
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Upload video
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoGalleryCard key={video.id} video={video} />
          ))}
        </div>
      )}

      <UploadVideoModal open={uploadOpen} onClose={() => setUploadOpen(false)} atCapacity={videos.length >= MAX_VIDEOS} />
    </div>
  );
}

type UploadStatus = "idle" | "uploading" | "uploaded" | "error";

/**
 * Upload flow: selecting a file starts the upload immediately in the
 * background (POST creates the row + stores the file) — the admin can keep
 * typing the caption/Instagram URL the entire time, since those live only
 * in local state until "Save Video". That button is disabled until the
 * upload finishes, then commits the caption/URL via a PATCH and closes.
 *
 * Closing before Save (Cancel, the X button, Escape, backdrop click) always
 * cleans up: an in-flight upload is aborted, and an already-finished-but-
 * unsaved upload is deleted — so an abandoned upload never leaves an
 * orphaned row or storage object behind.
 */
function UploadVideoModal({ open, onClose, atCapacity }: { open: boolean; onClose: () => void; atCapacity: boolean }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Refs, not state: read synchronously from handleCancel without waiting
  // on a re-render, and — being plain mutable values — never go stale
  // inside the mutation callbacks below the way a value captured in a
  // stale closure could.
  const controllerRef = useRef<AbortController | null>(null);
  const uploadedIdRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);

  // Empty deps: only calls stable setState setters and mutates refs, so it
  // never needs to change identity — that's what lets handleCancel below
  // depend on it without itself needing to change identity every render.
  const resetAll = useCallback(() => {
    setFile(null);
    setCaption("");
    setInstagramUrl("");
    setProgress(0);
    setStatus("idle");
    setUploadError(null);
    controllerRef.current = null;
    uploadedIdRef.current = null;
  }, []);

  const uploadMutation = useMutation({
    mutationFn: (f: File) => {
      const controller = new AbortController();
      controllerRef.current = controller;
      setStatus("uploading");
      setProgress(0);
      setUploadError(null);
      return videoGalleryApi.create(f, undefined, undefined, setProgress, controller.signal);
    },
    onSuccess: (row) => {
      uploadedIdRef.current = row.id;
      setProgress(100);
      setStatus("uploaded");
    },
    onError: (err) => {
      // A cancelled request also rejects — that's Cancel's own doing, not a
      // real failure, so it gets no error state/toast of its own.
      if (cancelledRef.current) {
        cancelledRef.current = false;
        return;
      }
      setStatus("error");
      setUploadError(errorMessage(err));
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const id = uploadedIdRef.current;
      if (!id) throw new Error("Upload hasn't finished yet.");
      return videoGalleryApi.updateDetails(id, { caption: caption || null, instagram_url: instagramUrl || null });
    },
    onSuccess: () => {
      showToast({ title: "Video saved", variant: "success" });
      void queryClient.invalidateQueries({ queryKey: VIDEO_GALLERY_QUERY_KEY });
      resetAll();
      onClose();
    },
    onError: (err) => showToast({ title: "Couldn't save video", description: errorMessage(err), variant: "error" }),
  });

  // Covers every way the modal can close before Save: the Cancel button,
  // the X button, Escape, and a backdrop click all route through this
  // single handler (passed directly as both Modal's onClose and the Cancel
  // button's onClick) — none of them should ever leave behind a row/file
  // the admin never confirmed with Save Video.
  //
  // Memoized (stable dependencies only — see resetAll above) so this
  // identity stays settled across keystrokes in the fields below: Modal's
  // focus-trap effect depends on `onClose`, and a fresh function here on
  // every render would re-run that effect (and its `.focus()` call on the
  // first field) on every keystroke, stealing focus back out of whichever
  // field the admin is typing in.
  const handleCancel = useCallback(() => {
    if (saveMutation.isPending) return;
    cancelledRef.current = true;
    controllerRef.current?.abort();
    if (uploadedIdRef.current) {
      videoGalleryApi.remove(uploadedIdRef.current).catch(() => {
        // Best-effort — a dangling row from a lost race is rare and can be
        // cleaned up manually; it must never block closing the modal.
      });
    }
    resetAll();
    onClose();
  }, [saveMutation.isPending, resetAll, onClose]);

  const handleRetry = () => {
    if (file) uploadMutation.mutate(file);
  };

  return (
    <Modal open={open} onClose={handleCancel} title="Upload video" size="lg" footer={
      <>
        <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={status !== "uploaded"}
          isLoading={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          Save Video
        </Button>
      </>
    }>
      <div className="flex flex-col gap-4">
        {atCapacity && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {MAX_VIDEOS} videos are already live — uploading this one will automatically remove the oldest.
          </p>
        )}

        {status === "idle" ? (
          <FileDropzone
            accept="video/mp4,video/webm"
            hint="MP4 or WebM, under 30MB — uploaded at original quality. Upload starts immediately."
            onFileSelected={(f) => {
              setFile(f);
              uploadMutation.mutate(f);
            }}
          />
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-medium text-neutral-700">{file?.name}</p>
              {status === "uploaded" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />}
            </div>

            {status === "uploading" && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Uploading…</span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-accent-600 transition-[width] duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {status === "uploaded" && <p className="mt-1.5 text-xs font-medium text-emerald-700">Upload complete</p>}

            {status === "error" && (
              <div className="mt-2.5 flex flex-col gap-2">
                <p className="text-xs text-red-600">{uploadError}</p>
                <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            )}
          </div>
        )}

        <Input
          label="Caption"
          placeholder="A short caption for this clip"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <Input
          label="Instagram URL"
          placeholder="https://www.instagram.com/… (optional)"
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          hint="Optional — only instagram.com links are kept."
        />
      </div>
    </Modal>
  );
}
