import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Content-area loading skeleton used by every workspace route's loading.tsx.
 * Mirrors the common page shape (title + toolbar + list rows) so navigating
 * between workspace pages swaps skeleton-for-content without the layout jump
 * a full-height centered spinner caused.
 */
export default function PageSkeleton({
  rows = 6,
  showToolbar = true,
  className,
}: {
  rows?: number;
  showToolbar?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("w-full space-y-6 py-6", className)}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      {showToolbar && (
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="ml-auto h-9 w-28" />
        </div>
      )}

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-16 w-full rounded-xl"
            style={{ opacity: 1 - i * 0.1 }}
          />
        ))}
      </div>
    </div>
  );
}
