"use client";

import { useMemo, useCallback } from "react";
import type React from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format-number";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { TriangleAlert } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import NumberFlow from "@number-flow/react";

interface ChartProps {
  data?: {
    time: string;
    clicks: number;
  }[];
  totalClicks?: number;
  timePeriod?: "24h" | "7d" | "30d" | "3m" | "12m" | "all";
  workspaceslug?: string;
  searchParams?: Record<string, string>;
  isLoading?: boolean;
  error?: Error;
}

const CHART_THEME = {
  primary: "#EA877E",
  background: "hsl(var(--background))",
  border: "hsl(var(--border))",
  foreground: "hsl(var(--foreground))",
  muted: "hsl(var(--muted-foreground))",
};

const CHART_CONFIG = {
  MAX_DATA_POINTS: 500,
  TICK_COUNTS: {
    "24h": 12,
    "7d": 7,
    "30d": 10,
    "3m": 3,
    "12m": 12,
    all: 6,
  },
  ANIMATION_THRESHOLD: 1000,
} as const;

const AnalyticsChart = ({
  data: propData,
  totalClicks: propTotalClicks,
  timePeriod = "24h",
  isLoading,
  error,
}: ChartProps) => {
  // Memoize data processing to avoid unnecessary recalculations
  const processedData = useMemo(() => {
    if (!propData) return [];

    const formattedData = propData.map((item) => {
      const date = new Date(item.time);
      if (isNaN(date.getTime())) {
        return {
          time: "",
          timestamp: 0,
          clicks: item.clicks ?? 0,
        };
      }
      return {
        time: date.toISOString(),
        timestamp: date.getTime(),
        clicks: item.clicks ?? 0,
      };
    });

    const sortedData = [...formattedData].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    return sortedData.length > CHART_CONFIG.MAX_DATA_POINTS
      ? sortedData.filter(
          (_, index) =>
            index %
              Math.ceil(sortedData.length / CHART_CONFIG.MAX_DATA_POINTS) ===
            0,
        )
      : sortedData;
  }, [propData]);

  // Memoize time formatting function to prevent recreation on every render
  const formatTime = useCallback(
    (timeStr: string): string => {
      if (!timeStr) return "";
      try {
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) return "";

        if (timePeriod === "24h") {
          // Round to the nearest hour for 24h period
          const roundedDate = new Date(date);
          roundedDate.setMinutes(0, 0, 0); // Set minutes and seconds to 0

          return roundedDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
        }
        if (timePeriod === "7d" || timePeriod === "30d") {
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        }
        return date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
      } catch {
        return "";
      }
    },
    [timePeriod],
  );

  interface CustomTooltipProps extends TooltipProps<number, string> {
    active?: boolean;
    payload?: Array<{
      value: number;
      name: string;
      dataKey: string;
    }>;
    label?: string;
  }

  // Memoize tooltip component to prevent recreation
  const CustomTooltip = useCallback<React.FC<CustomTooltipProps>>(
    ({ active, payload, label }) => {
      if (!active || !payload?.length || !label) return null;

      try {
        const date = new Date(label);
        if (isNaN(date.getTime())) return null;

        const formattedDate = formatTime(label);
        const clicks = payload[0]?.value;

        return (
          <div
            className="rounded-md border bg-white py-2 shadow-xs"
            style={{ backgroundColor: "#fff" }}
            role="tooltip"
          >
            <p
              className="m-0 px-3 text-sm font-normal"
              style={{ color: CHART_THEME.foreground }}
            >
              {formattedDate}
            </p>
            <Separator className="my-1 px-0" />
            <div
              className="m-0 px-3 text-sm flex items-center gap-2"
              style={{ color: CHART_THEME.foreground }}
            >
              <div className="h-[8px] w-[8px] bg-[#EA877E]" />{" "}
              <span>Clicks:</span>
              {formatNumber(clicks!)}
            </div>
          </div>
        );
      } catch {
        return null;
      }
    },
    [formatTime],
  );

  // Memoize tick count calculation
  const getTickCount = useCallback((): number => {
    return CHART_CONFIG.TICK_COUNTS[timePeriod] ?? 6;
  }, [timePeriod]);

  return (
    <Card className="w-full border p-0 shadow-none">
      <CardHeader className="grid grid-cols-2 md:grid-cols-3 gap-0 px-0">
        <CardTitle className="flex h-full w-full cursor-pointer flex-col items-baseline gap-2 border-r border-b p-5 text-[28px] font-medium sm:p-8">
          <div className="text-muted-foreground flex items-center gap-2 text-xs sm:text-sm font-normal">
            <div className="h-2.5 w-2.5 bg-[#EA877E] sm:mb-1" />{" "}
            <span>Clicks</span>
          </div>
          <NumberFlow
            value={propTotalClicks ?? 0}
            format={{ maximumFractionDigits: 0 }}
            className="text-2xl sm:text-3xl"
          />
        </CardTitle>
        <div className="hidden h-full border-r border-b p-5 sm:block"></div>
        <div className="hidden h-full border-b p-5 sm:block"></div>
      </CardHeader>
      <CardContent className="p-0 pr-2 pb-4">
        <div className="relative h-[320px] w-full sm:h-[500px]">
          {isLoading && (
            <div className="bg-background/10 absolute top-0 left-0 z-10 flex h-full w-full items-center justify-center">
              <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          )}
          {error && (
            <div className="bg-background/10 absolute top-0 left-0 z-10 flex h-full w-full items-center justify-center">
              <div className="text-center">
                <TriangleAlert className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  Failed to load chart data
                </p>
              </div>
            </div>
          )}
          {processedData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={processedData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={CHART_THEME.primary}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="50%"
                      stopColor={CHART_THEME.primary}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={CHART_THEME.primary}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatTime}
                  style={{ fontSize: "12px", fill: CHART_THEME.muted }}
                  minTickGap={20}
                  tick={{ dy: 10 }}
                  tickCount={getTickCount()}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  domain={[0, "auto"]}
                  style={{ fontSize: "12px", fill: CHART_THEME.muted }}
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
                    stroke: "#fff",
                    fill: CHART_THEME.primary,
                  }}
                  isAnimationActive={
                    processedData.length < CHART_CONFIG.ANIMATION_THRESHOLD
                  }
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : !isLoading && !error ? (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              No chart data available.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsChart;
