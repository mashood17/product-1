import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FolderTree, UtensilsCrossed, Film, Star, ArrowUpRight, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { dashboardApi } from "../../api/resources";
import { Card, CardBody, CardHeader, ErrorState, PageHeader, StatCardSkeleton } from "../../components/ui";
import { errorMessage } from "../../lib/query-client";
import { formatDateTime, humanizeKey } from "../../lib/utils";

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardApi.stats,
  });

  return (
    <div>
      <PageHeader title="Dashboard" description="A snapshot of ELATŌ's site activity." />

      {isError ? (
        <ErrorState description={errorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {isLoading || !data ? (
              Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatCard icon={FolderTree} label="Menu Categories" value={data.total_categories} to="/categories" manageLabel="Manage" />
                <StatCard icon={UtensilsCrossed} label="Menu Items" value={data.total_menu_items} to="/menu" manageLabel="Manage" />
                <StatCard icon={Film} label="Video Showcase" value={data.total_gallery_videos} to="/video-gallery" />
                <StatCard icon={Star} label="Reviews" value={data.total_reviews} to="/homepage" />
              </>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Recent Activity" description="Latest event types captured by the site" />
              <CardBody>
                {isLoading || !data ? (
                  <div className="text-xs text-neutral-400">Loading…</div>
                ) : data.recent_events.length === 0 ? (
                  <p className="text-xs text-neutral-400">No activity recorded yet.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {data.recent_events.map((group) => (
                      <li key={group.event_name} className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50">
                            <Activity className="h-3.5 w-3.5 text-accent-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-800">{humanizeKey(group.event_name)}</p>
                            <p className="text-xs text-neutral-400">{formatDateTime(group.last_seen)}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-medium tabular-nums text-neutral-500">×{group.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Last 30 Days" description="Analytics events by name" />
              <CardBody>
                {isLoading || !data ? (
                  <div className="text-xs text-neutral-400">Loading…</div>
                ) : (
                  <AnalyticsMiniBars counts={data.analytics_last_30_days} />
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  manageLabel,
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  manageLabel?: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-neutral-200/80 bg-white p-5 shadow-elevation-sm transition-all hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-elevation-md"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
        <Icon className="h-4 w-4 text-neutral-300 group-hover:text-accent-500" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-neutral-900">{value}</p>
      {manageLabel && (
        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-accent-700">
          {manageLabel} <ArrowUpRight className="h-3 w-3" />
        </p>
      )}
    </Link>
  );
}

function AnalyticsMiniBars({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return <p className="text-xs text-neutral-400">No analytics events recorded in this window.</p>;
  }
  const max = Math.max(...entries.map(([, v]) => v));
  return (
    <ul className="flex flex-col gap-2.5">
      {entries.map(([name, count]) => (
        <li key={name}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-neutral-700">{humanizeKey(name)}</span>
            <span className="text-neutral-400">{count}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-neutral-100">
            <div
              className="h-1.5 rounded-full bg-accent-500"
              style={{ width: `${max === 0 ? 0 : Math.max(4, (count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
