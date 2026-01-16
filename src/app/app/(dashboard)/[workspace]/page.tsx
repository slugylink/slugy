import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

import LinksTable from "@/components/web/_links/links-table";

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
}

export default async function Workspace({ params }: WorkspacePageProps) {
  const { workspace } = await params;

  if (!workspace?.trim()) {
    throw new Error("Invalid workspace parameter");
  }

  return (
    <div className="mt-8">
      <Suspense fallback={<LinksTableSkeleton />}>
        <LinksTable workspaceslug={workspace} />
      </Suspense>
    </div>
  );
}
