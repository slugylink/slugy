import { formatNumber } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import { LoaderCircle } from "@/utils/icons/loader-circle";

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
  // Find actual max in data, in case not sorted
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
      {data.map((item, index) => {
        const clicks = getClicks(item);
        const widthPercentage = maxClicks ? (clicks / maxClicks) * 100 : 0;
        const keyId = getKey(item, index);
        return (
          <div
            key={`${keyPrefix}-${keyId}`}
            className="relative flex items-center border-none"
            role="listitem"
          >
            <span
              className={cn(
                "absolute inset-y-1 left-0 my-auto h-[92%] rounded-md",
                progressColor,
              )}
              style={{ width: `${widthPercentage}%` }}
              aria-hidden="true"
              title={`Row progress: ${formatNumber(clicks)} out of ${formatNumber(maxClicks)}`}
            />
            <div className="relative z-10 flex-1 p-2 text-left">
              <div className="relative z-10 text-sm">{renderName(item)}</div>
            </div>
            <div className="relative z-10 min-w-[80px] p-2 text-right text-sm">
              {formatNumber(clicks)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
