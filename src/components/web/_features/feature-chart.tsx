"use client";
import type React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  type TooltipProps,
} from "recharts";
import { formatNumber } from "@/lib/format-number";
import { Separator } from "@/components/ui/separator";

// ===== Constants =====
const CHART_THEME = {
  primary: "#EA877E",
  background: "hsl(var(--background))",
  border: "hsl(var(--border))",
  foreground: "hsl(var(--foreground))",
  muted: "hsl(var(--muted-foreground))",
};
const DUMMY_TOTALS: Record<string, number> = {
  "24h": 318,
  "7d": 796,
  "30d": 3057,
  "3m": 7035,
  "12m": 135992,
  all: 31990,
};
const DUMMY_DATA: Record<string, { time: string; clicks: number }[]> = {
  "7d": [
    { time: "2025-01-21T00:00:00Z", clicks: 145 },
    { time: "2025-01-22T00:00:00Z", clicks: 67 },
    { time: "2025-01-23T00:00:00Z", clicks: 123 },
    { time: "2025-01-24T00:00:00Z", clicks: 123 },
    { time: "2025-01-25T00:00:00Z", clicks: 156 },
    { time: "2025-01-26T00:00:00Z", clicks: 98 },
    { time: "2025-01-27T00:00:00Z", clicks: 134 },
  ],
};

// ===== Types =====
interface ChartProps {
  data?: { time: string; clicks: number }[];
  totalClicks?: number;
  timePeriod: "24h" | "7d" | "30d" | "3m" | "12m" | "all";
  workspaceslug?: string;
  searchParams?: Record<string, string>;
}

interface ChartDataPoint {
  time: string;
  timestamp: number;
  clicks: number;
}

// ===== Chart Component =====
const FeatureAnalyticsChart = ({
  data: propData,
  totalClicks: propTotalClicks,
  timePeriod = "7d",
}: ChartProps) => {
  const [localData, setLocalData] = useState<ChartDataPoint[]>([]);
  const [activeTooltip, setActiveTooltip] = useState<{
    active: boolean;
    payload: Array<{
      value: number;
      name: string;
      dataKey: string;
    }>;
    label: string;
  } | null>({
    active: true,
    payload: [{ value: 123, name: "clicks", dataKey: "clicks" }],
    label: "2025-01-23T00:00:00Z"
  });

  // Compute total clicks with memo for perf.
  const totalClicks = useMemo(
    () => propTotalClicks ?? DUMMY_TOTALS[timePeriod] ?? 0,
    [propTotalClicks, timePeriod]
  );

  // Prepare data on mount/prop change.
  useEffect(() => {
    const inputData = propData ?? DUMMY_DATA[timePeriod] ?? [];
    const processedData = inputData
      .map((item) => {
        const date = new Date(item.time);
        return !isNaN(date.getTime())
          ? {
              time: date.toISOString(),
              timestamp: date.getTime(),
              clicks: item.clicks ?? 0,
            }
          : {
              time: "",
              timestamp: 0,
              clicks: item.clicks ?? 0,
            };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    // Downsample for large datasets.
    const sampled =
      processedData.length > 500
        ? processedData.filter(
            (_, i) => i % Math.ceil(processedData.length / 500) === 0
          )
        : processedData;
    setLocalData(sampled);
  }, [propData, timePeriod]);

  // Helper: Formatting X ticks.
  const formatTime = useCallback(
    (timeStr: string): string => {
      if (!timeStr) return "";
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return "";
      if (timePeriod === "24h")
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      if (timePeriod === "7d" || timePeriod === "30d")
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    },
    [timePeriod]
  );

  // Custom Tooltip
  const CustomTooltip: React.FC<TooltipProps<number, string>> = ({
    active,
    payload,
    label,
  }) => {
    // Use active tooltip state if no hover interaction
    const tooltipData = active ? { active, payload, label } : activeTooltip;
    if (!tooltipData?.active || !tooltipData.payload?.length || !tooltipData.label) return null;
    const date = new Date(tooltipData.label);
    if (isNaN(date.getTime())) return null;
    let formattedDate = "";
    if (timePeriod === "24h") {
      formattedDate =
        date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }) +
        ", " +
        date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
    } else if (timePeriod === "7d" || timePeriod === "30d") {
      formattedDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } else {
      formattedDate = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    }

    return (
      <div
        className="rounded-md border bg-white py-2 shadow-xs"
        style={{ backgroundColor: "#fff" }}
        role="tooltip"
      >
        <p className="m-0 px-3 text-sm text-start" style={{ color: CHART_THEME.foreground }}>
          {formattedDate}
        </p>
        <Separator className="my-1 px-0" />
                 <p className="m-0 px-3 text-sm" style={{ color: CHART_THEME.foreground }}>
           <span className="font-normal">Clicks:</span> {formatNumber(tooltipData.payload[0]?.value ?? 0)}
         </p>
      </div>
    );
  };

  // ===== Render =====
  return (
    <Card className="w-full border rounded-b-none border-b-0 shadow-[0_0_16px_rgba(0,0,0,0.07)]">
      <CardHeader className="px-4">
        <CardTitle className="flex w-fit items-baseline gap-2 text-lg font-medium">
          {formatNumber(totalClicks)}
          <span className="text-muted-foreground text-xs font-normal">Clicks</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0.5">
        <div className="relative h-[280px] w-full">
          {localData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={localData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_THEME.primary} stopOpacity={0.8} />
                    <stop offset="50%" stopColor={CHART_THEME.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_THEME.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatTime}
                  style={{ fontSize: "10px", fill: CHART_THEME.muted }}
                  minTickGap={20}
                  tick={{ dy: 10 }}
                  tickCount={7}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  domain={[0, "auto"]}
                  style={{ fontSize: "10px", fill: CHART_THEME.muted }}
                  width={30}
                />
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.35} />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{
                    stroke: CHART_THEME.muted,
                    strokeWidth: 1,
                    strokeOpacity: 0.3,
                  }}
                />
                <Area
                  type="linear"
                  dataKey="clicks"
                  stroke={CHART_THEME.primary}
                  fill="url(#colorClicks)"
                  strokeWidth={1.5}
                  activeDot={{
                    r: 5,
                    strokeWidth: 1,
                    stroke: "rgb(255, 255, 255)",
                    fill: CHART_THEME.primary,
                  }}
                  isAnimationActive={localData.length < 1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              No chart data available.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureAnalyticsChart;
