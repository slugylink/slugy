import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

import LinksTable from "@/components/web/_links/links-table";
import { prefetchWorkspaceLinks } from "@/lib/links/prefetch-workspace-links";

function LinksTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

interface WorkspacePageProps {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function Workspace({
  params,
  searchParams,
}: WorkspacePageProps) {
  const { workspace } = await params;
  const query = await searchParams;

  if (!workspace?.trim()) {
    throw new Error("Invalid workspace parameter");
  }

  const fallbackData = await prefetchWorkspaceLinks({
    workspaceslug: workspace,
    search: firstParam(query.search),
    showArchived: firstParam(query.showArchived),
    sortBy: firstParam(query.sortBy),
    pageNo: firstParam(query.page_no),
    tag: firstParam(query.tag),
  });

  return (
    <div className="mt-8">
      <Suspense fallback={<LinksTableSkeleton />}>
        <LinksTable workspaceslug={workspace} fallbackData={fallbackData} />
      </Suspense>
    </div>
  );
}
