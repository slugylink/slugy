import { Suspense } from "react";
import { AnalyticsClient } from "./analytics-client";
import { prefetchWorkspaceAnalytics } from "@/lib/analytics/prefetch-workspace-analytics";

interface AnalyticsPageProps {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function AnalyticsFallback() {
  return (
    <div className="my-6 space-y-4">
      <div className="bg-muted h-72 w-full animate-pulse rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-muted h-64 w-full animate-pulse rounded-lg"
          />
        ))}
      </div>
    </div>
  );
}

export default async function Analytics({
  params,
  searchParams,
}: AnalyticsPageProps) {
  const { workspace } = await params;
  const query = await searchParams;

  const fallbackData = await prefetchWorkspaceAnalytics(workspace, query);

  return (
    <Suspense fallback={<AnalyticsFallback />}>
      <AnalyticsClient workspace={workspace} fallbackData={fallbackData} />
    </Suspense>
  );
}
