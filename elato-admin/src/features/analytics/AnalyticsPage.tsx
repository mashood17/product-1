import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { dashboardApi } from "../../api/resources";
import { Card, CardBody, CardHeader, EmptyState, ErrorState, PageHeader } from "../../components/ui";
import { errorMessage } from "../../lib/query-client";
import { humanizeKey } from "../../lib/utils";

export function AnalyticsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardApi.stats,
  });

  const entries = data ? Object.entries(data.analytics_last_30_days).sort((a, b) => b[1] - a[1]) : [];
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const max = entries.length > 0 ? Math.max(...entries.map(([, v]) => v)) : 0;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Event counts captured via the public site's analytics beacon, last 30 days."
      />

      {isError ? (
        <ErrorState description={errorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        <Card>
          <CardHeader
            title="Events by name"
            description={data ? `${total.toLocaleString()} events across ${entries.length} event types` : undefined}
          />
          <CardBody>
            {isLoading || !data ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-8 animate-skeleton rounded-lg bg-neutral-100" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No analytics events yet"
                description="They'll appear here once the public site starts sending them."
              />
            ) : (
              <ul className="flex flex-col gap-4">
                {entries.map(([name, count]) => (
                  <li key={name} className="flex items-center gap-4">
                    <div className="w-48 shrink-0 text-sm font-medium text-neutral-800">{humanizeKey(name)}</div>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-600 transition-all"
                        style={{ width: `${max === 0 ? 0 : Math.max(3, (count / max) * 100)}%` }}
                      />
                    </div>
                    <div className="w-12 shrink-0 text-right text-sm font-medium tabular-nums text-neutral-600">
                      {count.toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
