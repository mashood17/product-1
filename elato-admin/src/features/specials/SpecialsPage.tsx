import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Sparkles, ImageOff } from "lucide-react";
import { mediaApi, specialsApi } from "../../api/resources";
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  TableSkeleton,
  Textarea,
} from "../../components/ui";
import { SortableList } from "../../components/ui/SortableList";
import { ImagePickerField } from "../media/ImagePickerField";
import { mediaQueryKey } from "../media/media-query-key";
import { DIMENSION_SPECS } from "../media/upload-specs";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../lib/query-client";
import { formatCurrency } from "../../lib/utils";
import type { SpecialOut } from "../../types/api";

const QUERY_KEY = ["specials"];

export function SpecialsPage() {
  const { hasRole } = useAuth();
  const canDelete = hasRole("owner", "admin");
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => specialsApi.list({ limit: 100, offset: 0 }),
  });

  const { data: specialImages } = useQuery({
    queryKey: mediaQueryKey("menu"),
    queryFn: () => mediaApi.list({ bucket: "menu", limit: 100 }),
  });
  const imageById = new Map((specialImages?.items ?? []).map((m) => [m.id, m.url]));

  const [orderedItems, setOrderedItems] = useState<SpecialOut[]>([]);
  useEffect(() => {
    if (data) setOrderedItems([...data.items].sort((a, b) => a.display_order - b.display_order));
  }, [data]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SpecialOut | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpecialOut | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => specialsApi.remove(id),
    onSuccess: () => {
      showToast({ title: "Special deleted", variant: "success" });
      setDeleteTarget(null);
      void invalidate();
    },
    onError: (err) => showToast({ title: "Couldn't delete special", description: errorMessage(err), variant: "error" }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: SpecialOut[]) => {
      const changed = items.map((item, index) => ({ item, index })).filter(({ item, index }) => item.display_order !== index);
      await Promise.all(changed.map(({ item, index }) => specialsApi.update(item.id, { display_order: index })));
    },
    onSuccess: () => void invalidate(),
    onError: (err) => {
      showToast({ title: "Couldn't save new order", description: errorMessage(err), variant: "error" });
      void invalidate();
    },
  });

  function handleReorder(next: SpecialOut[]) {
    setOrderedItems(next);
    reorderMutation.mutate(next);
  }

  return (
    <div>
      <PageHeader
        title="Specials"
        description="Time-boxed promotions shown on the public site. Drag to reorder."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add special
          </Button>
        }
      />

      <Card>
        <CardHeader title={`${data?.total ?? "…"} specials`} />
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : isError ? (
          <ErrorState description={errorMessage(error)} onRetry={() => void refetch()} />
        ) : orderedItems.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No specials yet"
            description="Create a limited-time offer to feature it on the public site."
            action={
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add special
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden items-center gap-3 border-b border-neutral-100 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 sm:flex">
              <span className="w-9" />
              <span className="w-12">Image</span>
              <span className="flex-1">Title</span>
              <span className="w-24">Price</span>
              <span className="w-[72px]">Actions</span>
            </div>
            <SortableList
              items={orderedItems}
              getId={(s) => s.id}
              onReorder={handleReorder}
              className="divide-y divide-neutral-100 px-2 py-1"
              renderItem={(special) => (
                <div className="flex flex-1 items-center gap-3 py-2.5 pr-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                    {special.image_id && imageById.get(special.image_id) ? (
                      <img src={imageById.get(special.image_id)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageOff className="h-4 w-4 text-neutral-300" />
                    )}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">{special.title}</p>
                  <p className="w-24 shrink-0 text-sm text-neutral-600">{formatCurrency(special.price)}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${special.title}`}
                      onClick={() => {
                        setEditing(special);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {canDelete && (
                      <Button variant="ghost" size="icon" aria-label={`Delete ${special.title}`} onClick={() => setDeleteTarget(special)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            />
          </>
        )}
      </Card>

      <SpecialFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        special={editing}
        nextDisplayOrder={orderedItems.length}
        onSaved={() => {
          setFormOpen(false);
          void invalidate();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.title}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function SpecialFormModal({
  open,
  onClose,
  special,
  nextDisplayOrder,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  special: SpecialOut | null;
  nextDisplayOrder: number;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageId, setImageId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(special?.title ?? "");
      setDescription(special?.description ?? "");
      setPrice(special?.price != null ? String(special.price) : "");
      setImageId(special?.image_id ?? null);
    }
  }, [open, special]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        title,
        description: description || null,
        price: price ? Number(price) : null,
        image_id: imageId,
      };
      return special
        ? specialsApi.update(special.id, payload)
        : specialsApi.create({ ...payload, display_order: nextDisplayOrder });
    },
    onSuccess: () => {
      showToast({ title: special ? "Special updated" : "Special created", variant: "success" });
      onSaved();
    },
    onError: (err) => showToast({ title: "Couldn't save special", description: errorMessage(err), variant: "error" }),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={special ? "Edit special" : "Add special"}
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" isLoading={mutation.isPending} onClick={() => mutation.mutate()} disabled={!title}>
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
        <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input
          label="Price (INR)"
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <ImagePickerField label="Image" bucket="menu" imageId={imageId} onChange={setImageId} spec={DIMENSION_SPECS.specialItem} />
      </form>
    </Modal>
  );
}
