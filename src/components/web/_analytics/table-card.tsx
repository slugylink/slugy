"use client";
import { formatNumber } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

interface TableCardProps<T> {
  data: T[];
  loading: boolean;
  error?: Error;
  keyPrefix: string;
  renderName: (item: T) => React.ReactNode;
  getClicks: (item: T) => number;
  getKey: (item: T, index: number) => string;
  progressColor?: string;
  emptyText?: string;
}

export default function TableCard<T>({
  data,
  loading,
  error,
  keyPrefix,
  renderName,
  getClicks,
  getKey,
  progressColor = "bg-muted",
  emptyText = "No data available",
}: TableCardProps<T>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Build current full path from `next/navigation`
  const currentPath = useMemo(() => {
    if (!pathname) return "";
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const maxClicks = useMemo(
    () => (data.length > 0 ? Math.max(...data.map(getClicks)) : 1),
    [data, getClicks],
  );

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center py-4 text-gray-500">
        <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center py-4 text-gray-500 text-sm">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-1" role="list">
      {data.map((item, index) => {
        const clicks = getClicks(item);
        const widthPercentage = maxClicks ? (clicks / maxClicks) * 100 : 0;
        const keyId = getKey(item, index);
        const paramJoiner = currentPath.includes("?") ? "&" : "?";
        const href = `${currentPath}${paramJoiner}${keyPrefix}_key=${encodeURIComponent(keyId)}`;

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
                {renderName(item)}
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
