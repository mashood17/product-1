import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { siteContentApi } from "../../api/resources";
import { PageHeader } from "../../components/ui";
import { SectionImageCard } from "../shared/SectionImageCard";
import { DIMENSION_SPECS } from "../media/upload-specs";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../lib/query-client";

const GATHERINGS_IMAGE_KEY = "celebre_gatherings_image";

export function CelebrePage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

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

  return (
    <div>
      <PageHeader title="Celebré" description="Content shown on the public Celebré page." />

      <div className="flex flex-col gap-4">
        <SectionImageCard
          label="Small Gatherings"
          description="Image for the Small Gatherings section on the Celebré page."
          bucket="hero"
          value={siteContentByKey.get(GATHERINGS_IMAGE_KEY)}
          onSave={(image) => saveSectionImage.mutate({ key: GATHERINGS_IMAGE_KEY, value: image })}
          isSaving={saveSectionImage.isPending && saveSectionImage.variables?.key === GATHERINGS_IMAGE_KEY}
          spec={DIMENSION_SPECS.section}
        />
      </div>
    </div>
  );
}
