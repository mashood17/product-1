import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { siteContentApi } from "../../api/resources";
import { PageHeader } from "../../components/ui";
import { GalleryPanel } from "../shared/GalleryPanel";
import { SectionImageCard } from "../shared/SectionImageCard";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../lib/query-client";

const INTRO_IMAGE_KEY = "stay_intro_image";
const RESERVE_IMAGE_KEY = "stay_reserve_image";

export function StayPage() {
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
      <PageHeader
        title="Stay"
        description="Content shown on the public Stay page."
      />

      <div className="flex flex-col gap-4">
        <SectionImageCard
          label="The Stay — Information Section"
          description="Image shown next to the “A spacious 2BHK” introduction on the Stay page."
          bucket="stay"
          value={siteContentByKey.get(INTRO_IMAGE_KEY)}
          onSave={(image) => saveSectionImage.mutate({ key: INTRO_IMAGE_KEY, value: image })}
          isSaving={saveSectionImage.isPending && saveSectionImage.variables?.key === INTRO_IMAGE_KEY}
        />
        <GalleryPanel
          category="stay"
          title="Boutique Retreat & Gallery Images"
          maxItems={15}
          limitMessage="Maximum of 15 images allowed for the Stay Gallery. Please delete an existing image before uploading a new one."
        />
        <SectionImageCard
          label="Reserve Your Stay"
          description="Image for the booking call-to-action."
          bucket="stay"
          value={siteContentByKey.get(RESERVE_IMAGE_KEY)}
          onSave={(image) => saveSectionImage.mutate({ key: RESERVE_IMAGE_KEY, value: image })}
          isSaving={saveSectionImage.isPending && saveSectionImage.variables?.key === RESERVE_IMAGE_KEY}
        />
      </div>
    </div>
  );
}
