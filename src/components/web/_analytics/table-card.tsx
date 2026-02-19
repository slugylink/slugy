"use client";
import { formatNumber } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

interface TableCardProps<T> {
  data: T[];
  loading: boolean;
  error?: Error;
  keyPrefix: string;
  NameComponent: React.ComponentType<{ item: T }>;
  getClicks: (item: T) => number;
  getKey: (item: T, index: number) => string;
  progressColor?: string;
  emptyText?: string;
  dataKey?: string; // Unique identifier for the data source
}

function TableCardBody<T>({
  data,
  loading,
  error,
  keyPrefix,
  NameComponent,
  getClicks,
  getKey,
  progressColor = "bg-muted",
  emptyText = "No data available",
  dataKey,
}: TableCardProps<T>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Progress is rendered instantly without animation

  // Build the current full path with params
  const currentPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const maxClicks = useMemo(
    () => (data.length > 0 ? Math.max(...data.map(getClicks)) : 1),
    [data, getClicks],
  );

  // No animation state/effect; progress width is static

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center py-4 text-gray-500">
        <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-60 items-center justify-center py-4 text-sm text-gray-500">
        {emptyText}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center py-4 text-sm text-gray-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-1" role="list">
      {data.map((item, index) => {
        const clicks = getClicks(item);
        const targetWidthPercentage = maxClicks
          ? (clicks / maxClicks) * 100
          : 0;
        const widthPercentage = targetWidthPercentage;
        const keyId = getKey(item, index);
        const paramJoiner = currentPath.includes("?") ? "&" : "?";
        const href = `${currentPath}${paramJoiner}${dataKey}_key=${encodeURIComponent(keyId)}`;

        return (
          <Link key={`${keyPrefix}-${keyId}`} href={href} scroll={false}>
            <div
              className="hover:bg-muted/30 focus:bg-muted/40 relative flex cursor-pointer items-center border-none transition-colors"
              role="listitem"
            >
              {/* progress fill */}
              <span
                className={cn(
                  "absolute inset-y-1 left-0 my-auto h-[90%] rounded-md",
                  progressColor,
                )}
                style={{ width: `${widthPercentage}%` }}
                aria-hidden="true"
              />
              {/* name */}
              <div className="relative z-10 flex-1 p-2 text-left text-sm">
                <NameComponent item={item} />
              </div>
              {/* clicks */}
              <div className="relative z-10 min-w-[80px] p-2 text-right text-sm">
                {formatNumber(clicks)}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function TableCardFallback() {
  return (
    <div className="flex h-60 items-center justify-center py-4 text-gray-500">
      <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
    </div>
  );
}

export default function TableCard<T>(props: TableCardProps<T>) {
  return (
    <Suspense fallback={<TableCardFallback />}>
      <TableCardBody {...props} />
    </Suspense>
  );
}
