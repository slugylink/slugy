import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamic import with loading fallback
const LinksTable = dynamic(
  () => import("@/components/web/_links/links-table"),
  {
    ssr: true,
    loading: () => <LinksTableSkeleton />,
  },
);

// Loading skeleton component
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

export default async function Workspace({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  try {
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
  } catch (error) {
    console.error("Error in workspace page:", error);
    
    return (
      <div className="mt-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Failed to load workspace
          </h2>
          <p className="text-sm text-muted-foreground">
            Please try refreshing the page
          </p>
        </div>
      </div>
    );
  }
}
