import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { siteContentApi } from "../../api/resources";
import { ErrorState, PageHeader } from "../../components/ui";
import { SectionImageCard } from "../shared/SectionImageCard";
import { HeroBackgroundSection } from "./HeroBackgroundSection";
import { ReviewsSection } from "../reviews/ReviewsSection";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../lib/query-client";

// Each of these three images powers its service card on the homepage —
// that's the only place any of them is used.
const SERVICES_IMAGE_KEYS: { key: string; label: string; description: string }[] = [
  { key: "home_services_stay_image", label: "Stay", description: "Used for the Stay service card on the homepage." },
  { key: "home_services_celebre_image", label: "Celebré", description: "Used for the Celebré service card on the homepage." },
  { key: "home_services_events_image", label: "Events", description: "Used for the Events service card on the homepage." },
];

const ABOUT_IMAGE_KEY = "home_about_image";

export function HomepagePage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["site-content"],
    queryFn: siteContentApi.list,
  });

  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => siteContentApi.upsert(key, value),
    onSuccess: () => {
      showToast({ title: "Saved", variant: "success" });
      void queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: (err) => showToast({ title: "Couldn't save", description: errorMessage(err), variant: "error" }),
  });

  const byKey = new Map((data ?? []).map((c) => [c.key, c.value]));

  return (
    <div>
      <PageHeader title="Homepage" description="Services and About images and reviews shown on the public homepage. The video showcase has its own page." />

      {isError ? (
        <ErrorState description={errorMessage(error)} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-skeleton rounded-lg bg-neutral-100" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Hero Background</p>
            <p className="mb-3 text-xs text-neutral-400">
              The looping video behind the headline on Home, Stay, Celebré and Events — desktop and mobile each have
              their own clip.
            </p>
            <HeroBackgroundSection />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Services</p>
            <p className="mb-3 text-xs text-neutral-400">
              Each image below powers its service card on the homepage.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {SERVICES_IMAGE_KEYS.map((config) => (
                <SectionImageCard
                  key={config.key}
                  label={config.label}
                  description={config.description}
                  bucket="hero"
                  value={byKey.get(config.key)}
                  onSave={(image) => saveMutation.mutate({ key: config.key, value: image })}
                  isSaving={saveMutation.isPending && saveMutation.variables?.key === config.key}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">About</p>
            <SectionImageCard
              label="About section image"
              bucket="hero"
              value={byKey.get(ABOUT_IMAGE_KEY)}
              onSave={(image) => saveMutation.mutate({ key: ABOUT_IMAGE_KEY, value: image })}
              isSaving={saveMutation.isPending && saveMutation.variables?.key === ABOUT_IMAGE_KEY}
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Reviews</p>
            <ReviewsSection />
          </div>
        </div>
      )}
    </div>
  );
}
