import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, PartyPopper } from "lucide-react";
import { eventPackagesApi, siteContentApi } from "../../api/resources";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Switch,
  Table,
  Tbody,
  Td,
  Th,
  TableSkeleton,
  Thead,
  Textarea,
  Tr,
} from "../../components/ui";
import { ImagePickerField } from "../media/ImagePickerField";
import { GalleryPanel } from "../shared/GalleryPanel";
import { SectionImageCard } from "../shared/SectionImageCard";
import { DIMENSION_SPECS } from "../media/upload-specs";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../lib/query-client";
import type { EventPackageOut } from "../../types/api";

const LIMIT = 50;
const EXPERIENCE_IMAGE_KEY = "events_experience_image";
const PLAN_IMAGE_KEY = "events_plan_image";

export function EventsPage() {
  const { hasRole } = useAuth();
  const canDelete = hasRole("owner", "admin");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["event-packages", offset],
    queryFn: () => eventPackagesApi.list({ limit: LIMIT, offset }),
  });

  const siteContentQuery = useQuery({ queryKey: ["site-content"], queryFn: siteContentApi.list });
  const siteContentByKey = new Map((siteContentQuery.data ?? []).map((c) => [c.key, c.value]));
  const saveSectionImage = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => siteContentApi.upsert(key, value),
    onSuccess: () => {
      showToast({ title: "Saved", variant: "success" });
      void queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: (err) => showToast({ title: "Couldn't save", description: errorMessage(err), variant: "error" }),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventPackageOut | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventPackageOut | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["event-packages"] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventPackagesApi.remove(id),
    onSuccess: () => {
      showToast({ title: "Event package deleted", variant: "success" });
      setDeleteTarget(null);
      void invalidate();
    },
    onError: (err) => showToast({ title: "Couldn't delete package", description: errorMessage(err), variant: "error" }),
  });

  return (
    <div>
      <PageHeader
        title="Events"
        description="Event packages shown on the public site."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add package
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-4">
        <SectionImageCard
          label="The Experience — Section Image"
          description="Image shown next to the “Where Every Celebration Becomes a Lasting Memory” section."
          bucket="events"
          value={siteContentByKey.get(EXPERIENCE_IMAGE_KEY)}
          onSave={(image) => saveSectionImage.mutate({ key: EXPERIENCE_IMAGE_KEY, value: image })}
          isSaving={saveSectionImage.isPending && saveSectionImage.variables?.key === EXPERIENCE_IMAGE_KEY}
          spec={DIMENSION_SPECS.event}
        />
        <GalleryPanel
          category="events"
          title="Events Gallery"
          maxItems={10}
          limitMessage="Maximum of 10 images allowed for the Events Gallery. Please delete an existing image before uploading a new one."
          spec={DIMENSION_SPECS.gallery}
        />
        <SectionImageCard
          label="Plan Your Celebration"
          description="Image for the enquiry call-to-action."
          bucket="events"
          value={siteContentByKey.get(PLAN_IMAGE_KEY)}
          onSave={(image) => saveSectionImage.mutate({ key: PLAN_IMAGE_KEY, value: image })}
          isSaving={saveSectionImage.isPending && saveSectionImage.variables?.key === PLAN_IMAGE_KEY}
          spec={DIMENSION_SPECS.event}
        />
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Event Packages</p>
      <Card>
        <CardHeader title={`${data?.total ?? "…"} packages`} />
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : isError ? (
          <ErrorState description={errorMessage(error)} onRetry={() => void refetch()} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            title="No event packages yet"
            description="Add a package to feature it on the events page."
            action={
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add package
              </Button>
            }
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Title</Th>
                <Th>Guests</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.items.map((pkg) => (
                <Tr key={pkg.id}>
                  <Td className="font-medium text-neutral-800">{pkg.title}</Td>
                  <Td className="text-xs text-neutral-500">
                    {pkg.min_guests ?? "–"} – {pkg.max_guests ?? "–"}
                  </Td>
                  <Td>
                    <Badge tone={pkg.is_active ? "success" : "neutral"}>{pkg.is_active ? "Active" : "Inactive"}</Badge>
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${pkg.title}`}
                      onClick={() => {
                        setEditing(pkg);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {canDelete && (
                      <Button variant="ghost" size="icon" aria-label={`Delete ${pkg.title}`} onClick={() => setDeleteTarget(pkg)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
        {data && <Pagination total={data.total} limit={LIMIT} offset={offset} onOffsetChange={setOffset} />}
      </Card>

      <EventFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        eventPackage={editing}
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

function EventFormModal({
  open,
  onClose,
  eventPackage,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  eventPackage: EventPackageOut | null;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minGuests, setMinGuests] = useState("");
  const [maxGuests, setMaxGuests] = useState("");
  const [imageId, setImageId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open) {
      setTitle(eventPackage?.title ?? "");
      setDescription(eventPackage?.description ?? "");
      setMinGuests(eventPackage?.min_guests != null ? String(eventPackage.min_guests) : "");
      setMaxGuests(eventPackage?.max_guests != null ? String(eventPackage.max_guests) : "");
      setImageId(eventPackage?.image_id ?? null);
      setIsActive(eventPackage?.is_active ?? true);
    }
  }, [open, eventPackage]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        title,
        description: description || null,
        min_guests: minGuests ? Number(minGuests) : null,
        max_guests: maxGuests ? Number(maxGuests) : null,
        image_id: imageId,
        is_active: isActive,
      };
      return eventPackage ? eventPackagesApi.update(eventPackage.id, payload) : eventPackagesApi.create(payload);
    },
    onSuccess: () => {
      showToast({ title: eventPackage ? "Package updated" : "Package created", variant: "success" });
      onSaved();
    },
    onError: (err) => showToast({ title: "Couldn't save package", description: errorMessage(err), variant: "error" }),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={eventPackage ? "Edit event package" : "Add event package"}
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
        <div className="grid grid-cols-2 gap-4">
          <Input label="Min guests" type="number" min={0} value={minGuests} onChange={(e) => setMinGuests(e.target.value)} />
          <Input label="Max guests" type="number" min={0} value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} />
        </div>
        <ImagePickerField label="Image" bucket="events" imageId={imageId} onChange={setImageId} spec={DIMENSION_SPECS.event} />
        <Switch checked={isActive} onChange={setIsActive} label="Active" />
      </form>
    </Modal>
  );
}
