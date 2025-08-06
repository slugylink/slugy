import { formatNumber } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import Link from "next/link";
import { useEffect, useState } from "react";

interface TableCardProps<T> {
  data: T[];
  loading: boolean;
  error?: Error;
  keyPrefix: string;
  renderName: (item: T) => React.ReactNode;
  getClicks: (item: T) => number;
  getKey: (item: T, index: number) => string;
  progressColor?: string;
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
}: TableCardProps<T>) {
  const [currentPath, setCurrentPath] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const updatePath = () => {
        setCurrentPath(window.location.pathname + window.location.search);
      };
      updatePath();
      window.addEventListener("popstate", updatePath);
      return () => window.removeEventListener("popstate", updatePath);
    }
  }, []);

  const maxClicks = data.length > 0 ? Math.max(...data.map(getClicks)) : 1;

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center py-4 text-gray-500">
        <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center py-4 text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-1" role="list">
      {currentPath &&
        data.map((item, index) => {
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
                tabIndex={-1}
              >
                <span
                  className={cn(
                    "absolute inset-y-1 left-0 my-auto h-[90%] rounded-md",
                    progressColor,
                  )}
                  style={{ width: `${widthPercentage}%` }}
                  aria-hidden="true"
                />
                <div className="relative z-10 flex-1 p-2 text-left">
                  <div className="relative z-10 text-sm">
                    {renderName(item)}
                  </div>
                </div>
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
