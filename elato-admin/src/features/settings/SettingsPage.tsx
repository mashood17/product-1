import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { settingsApi } from "../../api/resources";
import { Card, CardBody, CardHeader, ErrorState, PageHeader, Switch } from "../../components/ui";
import { KeyValueCard } from "../shared/KeyValueCard";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../lib/query-client";
import { humanizeKey } from "../../lib/utils";

const FEATURE_FLAGS_KEY = "feature_flags";

const EXPECTED_KEYS: { key: string; label: string; description: string; defaultValue: Record<string, unknown> }[] = [
  {
    key: "whatsapp_number",
    label: "WhatsApp number",
    description: "Used by the public site's WhatsApp enquiry links.",
    defaultValue: { number: "+91" },
  },
  {
    key: "booking_url",
    label: "Booking.com URL",
    description: "Linked from the Stay page. Strip any tracking/campaign query params before saving.",
    defaultValue: { url: "" },
  },
  {
    key: "socials",
    label: "Social links",
    description: "Shown in the site footer.",
    defaultValue: { instagram: "", facebook: "", youtube: "" },
  },
];

function MaintenanceModeCard({
  value,
  onSave,
  isSaving,
}: {
  value: unknown;
  onSave: (value: unknown) => void;
  isSaving?: boolean;
}) {
  const enabled =
    typeof value === "object" && value !== null && (value as Record<string, unknown>).maintenance_mode === true;

  return (
    <Card>
      <CardHeader
        title="Maintenance Mode"
        description="When enabled, the public website will display a maintenance page and visitors cannot access the site."
      />
      <CardBody>
        <Switch
          checked={enabled}
          onChange={(next) => onSave({ maintenance_mode: next })}
          label={enabled ? "Enabled" : "Disabled"}
          disabled={isSaving}
        />
      </CardBody>
    </Card>
  );
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.list,
  });

  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => settingsApi.upsert(key, value),
    onSuccess: () => {
      showToast({ title: "Saved", variant: "success" });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err) => showToast({ title: "Couldn't save", description: errorMessage(err), variant: "error" }),
  });

  const byKey = new Map((data ?? []).map((c) => [c.key, c.value]));
  const extraKeys = (data ?? []).filter(
    (c) => c.key !== FEATURE_FLAGS_KEY && !EXPECTED_KEYS.some((e) => e.key === c.key),
  );

  return (
    <div>
      <PageHeader title="Settings" description="Site-wide configuration used by the public site." />

      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-neutral-200/80 bg-white px-4 py-3.5 text-xs text-neutral-600 shadow-elevation-sm">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-500" />
        <p>Owner and admin accounts only. Changes here take effect on the public site immediately.</p>
      </div>

      {isError ? (
        <ErrorState description={errorMessage(error)} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-skeleton rounded-lg bg-neutral-100" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {EXPECTED_KEYS.map((config) => (
            <KeyValueCard
              key={config.key}
              keyName={config.key}
              label={config.label}
              description={config.description}
              value={byKey.get(config.key)}
              defaultValue={config.defaultValue}
              onSave={(key, value) => saveMutation.mutate({ key, value })}
              isSaving={saveMutation.isPending && saveMutation.variables?.key === config.key}
            />
          ))}

          <MaintenanceModeCard
            value={byKey.get(FEATURE_FLAGS_KEY)}
            onSave={(value) => saveMutation.mutate({ key: FEATURE_FLAGS_KEY, value })}
            isSaving={saveMutation.isPending && saveMutation.variables?.key === FEATURE_FLAGS_KEY}
          />

          {extraKeys.length > 0 && (
            <>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-neutral-400">Other settings keys</p>
              {extraKeys.map((entry) => (
                <KeyValueCard
                  key={entry.key}
                  keyName={entry.key}
                  label={humanizeKey(entry.key)}
                  value={entry.value}
                  defaultValue={{}}
                  onSave={(key, value) => saveMutation.mutate({ key, value })}
                  isSaving={saveMutation.isPending && saveMutation.variables?.key === entry.key}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
