import PageSkeleton from "@/components/web/skeletons/page-skeleton";

// Analytics is chart-heavy: taller blocks approximate the chart grid, so the
// swap to real content doesn't shift the page.
export default function Loading() {
  return (
    <div className="w-full space-y-6 py-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="bg-muted h-6 w-40 animate-pulse rounded-md" />
        <div className="bg-muted h-4 w-64 animate-pulse rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-muted h-24 animate-pulse rounded-xl"
            style={{ opacity: 1 - i * 0.08 }}
          />
        ))}
      </div>
      <div className="bg-muted h-72 w-full animate-pulse rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-muted h-56 animate-pulse rounded-xl" />
        <div className="bg-muted h-56 animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
