import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Images, GripVertical } from "lucide-react";
import { galleryApi } from "../../api/resources";
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  CardGridSkeleton,
} from "../../components/ui";
import { SortableList } from "../../components/ui/SortableList";
import { ImagePickerField } from "../media/ImagePickerField";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../lib/query-client";
import type { DimensionSpec } from "../media/upload-specs";
import type { GalleryItemOut } from "../../types/api";

const GALLERY_QUERY_KEY = ["gallery-items"];

/**
 * Add/edit/delete/reorder panel over the shared `gallery` table. When
 * `category` is fixed (Stay's "stay" / Events' "events"), the panel only
 * shows and creates items tagged with that category and the form's category
 * field is hidden — used to give Stay/Events their own curated gallery
 * without a schema change.
 */
export function GalleryPanel({
  category,
  title,
  description,
  maxItems,
  limitMessage,
  spec,
}: {
  category?: string;
  title: string;
  description?: string;
  maxItems?: number;
  limitMessage?: string;
  spec?: DimensionSpec;
}) {
  const { hasRole } = useAuth();
  const canDelete = hasRole("owner", "admin");
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: GALLERY_QUERY_KEY,
    queryFn: () => galleryApi.list({ limit: 100, offset: 0 }),
  });

  const scoped = (data?.items ?? []).filter((item) => (category ? item.category === category : true));

  const [orderedItems, setOrderedItems] = useState<GalleryItemOut[]>([]);
  useEffect(() => {
    setOrderedItems([...scoped].sort((a, b) => a.display_order - b.display_order));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, category]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItemOut | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalleryItemOut | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: GALLERY_QUERY_KEY });

  const limitReached = maxItems !== undefined && scoped.length >= maxItems;
  const openAddForm = () => {
    if (limitReached) {
      showToast({ title: "Upload limit reached", description: limitMessage, variant: "error" });
      return;
    }
    setEditing(null);
    setFormOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => galleryApi.remove(id),
    onSuccess: () => {
      showToast({ title: "Photo deleted", variant: "success" });
      setDeleteTarget(null);
      void invalidate();
    },
    onError: (err) => showToast({ title: "Couldn't delete photo", description: errorMessage(err), variant: "error" }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: GalleryItemOut[]) => {
      const changed = items.map((item, index) => ({ item, index })).filter(({ item, index }) => item.display_order !== index);
      await Promise.all(changed.map(({ item, index }) => galleryApi.update(item.id, { display_order: index })));
    },
    onSuccess: () => void invalidate(),
    onError: (err) => {
      showToast({ title: "Couldn't save new order", description: errorMessage(err), variant: "error" });
      void invalidate();
    },
  });

  return (
    <Card>
      <CardHeader
        title={title}
        description={
          description ??
          `${scoped.length} photo${scoped.length === 1 ? "" : "s"} · drag to reorder${maxItems ? ` · Maximum ${maxItems} images.` : ""}`
        }
        actions={
          <Button size="sm" variant="outline" onClick={openAddForm}>
            <Plus className="h-3.5 w-3.5" /> Add photo
          </Button>
        }
      />
      <div className="p-4">
        {isLoading ? (
          <CardGridSkeleton count={4} />
        ) : isError ? (
          <ErrorState description={errorMessage(error)} onRetry={() => void refetch()} />
        ) : orderedItems.length === 0 ? (
          <EmptyState
            icon={Images}
            title="No photos yet"
            description="Add photos to build out this gallery."
            action={
              <Button size="sm" onClick={openAddForm}>
                <Plus className="h-3.5 w-3.5" /> Add photo
              </Button>
            }
          />
        ) : (
          <SortableList
            items={orderedItems}
            getId={(i) => i.id}
            variant="grid"
            onReorder={(next) => {
              setOrderedItems(next);
              reorderMutation.mutate(next);
            }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            renderItem={(item, handle) => (
              <div className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                <div className="aspect-square w-full overflow-hidden bg-neutral-100">
                  {item.media_url ? (
                    <img src={item.media_url} alt={item.caption ?? ""} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-neutral-400">No image</div>
                  )}
                </div>
                <button
                  type="button"
                  {...handle.attributes}
                  {...handle.listeners}
                  aria-label="Drag to reorder"
                  className="absolute left-1.5 top-1.5 cursor-grab touch-none rounded-md bg-white/90 p-1 text-neutral-500 opacity-0 shadow-elevation-sm transition-opacity group-hover:opacity-100 active:cursor-grabbing"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-center justify-between gap-1 px-2.5 py-2">
                  <div className="min-w-0">
                    {!category && item.category && (
                      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-accent-600">{item.category}</p>
                    )}
                    {item.caption && <p className="truncate text-xs text-neutral-600">{item.caption}</p>}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Edit photo"
                      onClick={() => {
                        setEditing(item);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Delete photo"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          />
        )}
      </div>

      <GalleryPanelFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        item={editing}
        fixedCategory={category}
        nextDisplayOrder={orderedItems.length}
        spec={spec}
        onSaved={() => {
          setFormOpen(false);
          void invalidate();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this photo?"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </Card>
  );
}

function GalleryPanelFormModal({
  open,
  onClose,
  item,
  fixedCategory,
  nextDisplayOrder,
  spec,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  item: GalleryItemOut | null;
  fixedCategory?: string;
  nextDisplayOrder: number;
  spec?: DimensionSpec;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [caption, setCaption] = useState("");

  useEffect(() => {
    if (open) {
      setMediaId(item?.media_id ?? null);
      setCategoryDraft(item?.category ?? "");
      setCaption(item?.caption ?? "");
    }
  }, [open, item]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!mediaId) throw new Error("Add an image first.");
      const payload = {
        media_id: mediaId,
        category: fixedCategory ?? categoryDraft ?? null,
        caption: caption || null,
      };
      return item ? galleryApi.update(item.id, payload) : galleryApi.create({ ...payload, display_order: nextDisplayOrder });
    },
    onSuccess: () => {
      showToast({ title: item ? "Photo updated" : "Photo added", variant: "success" });
      onSaved();
    },
    onError: (err) => showToast({ title: "Couldn't save photo", description: errorMessage(err), variant: "error" }),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "Edit photo" : "Add photo"}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" isLoading={mutation.isPending} onClick={() => mutation.mutate()} disabled={!mediaId}>
            Save
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <ImagePickerField label="Image" bucket="gallery" imageId={mediaId} onChange={setMediaId} spec={spec} />
        {!fixedCategory && (
          <Input
            label="Category tag"
            value={categoryDraft}
            onChange={(e) => setCategoryDraft(e.target.value)}
            placeholder="e.g. desserts, events, interiors"
          />
        )}
        <Input label="Description" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Shown alongside the photo" />
      </form>
    </Modal>
  );
}
