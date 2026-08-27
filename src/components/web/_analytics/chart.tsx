"use client";

import { useMemo, useCallback, type FC } from "react";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatNumber } from "@/lib/format-number";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { LineChart, Milestone, TriangleAlert } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import NumberFlow from "@number-flow/react";
import { useQueryState, parseAsString } from "nuqs";
import { cn } from "@/lib/utils";
import {
  parseAnalyticsEvent,
  parseAnalyticsView,
  type AnalyticsEvent,
  type AnalyticsView,
} from "@/components/web/_analytics/leads-demo-data";
import FunnelChart from "@/components/web/_analytics/funnel-chart";

type TimePeriod = "24h" | "7d" | "30d" | "3m" | "12m" | "all";

interface ChartDataPoint {
  time: string;
  clicks: number;
}

interface ProcessedDataPoint {
  time: string;
  timestamp: number;
  clicks: number;
}

interface ChartProps {
  data?: ChartDataPoint[];
  totalClicks?: number;
  /** null = not loaded yet (lazy leads fetch) */
  totalLeads?: number | null;
  timePeriod?: TimePeriod;
  workspaceslug?: string;
  searchParams?: Record<string, string>;
  isLoading?: boolean;
  isRefreshing?: boolean;
  error?: Error;
}

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
  }>;
  label?: string;
}

const EVENT_THEME = {
  clicks: {
    primary: "#3B82F6",
    gradientId: "colorClicks",
    label: "Clicks",
  },
  leads: {
    primary: "#ab3bdf",
    gradientId: "colorLeads",
    label: "Leads",
  },
} as const;

const CHART_THEME = {
  background: "hsl(var(--background))",
  border: "hsl(var(--border))",
  foreground: "hsl(var(--foreground))",
  muted: "hsl(var(--muted-foreground))",
} as const;

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

const getDateKey = (date: Date, timePeriod: TimePeriod): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");

  if (timePeriod === "24h") {
    return `${y}-${m}-${d}-${h}`;
  }

  if (timePeriod === "7d" || timePeriod === "30d") {
    return `${y}-${m}-${d}`;
  }

  return `${y}-${m}`;
};

const getBucketTimestamp = (date: Date, timePeriod: TimePeriod): number => {
  const bucket = new Date(date);

  if (timePeriod === "24h") {
    bucket.setMinutes(0, 0, 0);
    return bucket.getTime();
  }

  if (timePeriod === "7d" || timePeriod === "30d") {
    bucket.setHours(0, 0, 0, 0);
    return bucket.getTime();
  }

  bucket.setDate(1);
  bucket.setHours(0, 0, 0, 0);
  return bucket.getTime();
};

const AnalyticsChart = ({
  data: propData,
  totalClicks: propTotalClicks,
  totalLeads: propTotalLeads,
  timePeriod = "24h",
  isLoading,
  isRefreshing,
  error,
}: ChartProps) => {
  const [eventParam, setEventParam] = useQueryState("event", parseAsString);
  const [viewParam, setViewParam] = useQueryState("view", parseAsString);
  const event: AnalyticsEvent = parseAnalyticsEvent(eventParam);
  const view: AnalyticsView = parseAnalyticsView(viewParam);
  const isFunnel = view === "funnel";
  const theme = EVENT_THEME[event];

  const selectEvent = useCallback(
    (next: AnalyticsEvent) => {
      void setEventParam(next === "clicks" ? null : next);
    },
    [setEventParam],
  );

  const selectView = useCallback(
    (next: AnalyticsView) => {
      void setViewParam(next === "timeseries" ? null : next);
    },
    [setViewParam],
  );

  const processedData = useMemo(() => {
    if (!propData) return [];

    const formattedData: ProcessedDataPoint[] = propData.map((item) => {
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

    const deduplicatedMap = new Map<string, ProcessedDataPoint>();

    formattedData.forEach((item) => {
      const date = new Date(item.timestamp);
      const dateKey = getDateKey(date, timePeriod);

      const existing = deduplicatedMap.get(dateKey);
      if (existing) {
        existing.clicks += item.clicks;
      } else {
        const bucketTimestamp = getBucketTimestamp(date, timePeriod);
        deduplicatedMap.set(dateKey, {
          ...item,
          timestamp: bucketTimestamp,
          time: new Date(bucketTimestamp).toISOString(),
        });
      }
    });

    const sortedData = Array.from(deduplicatedMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    if (sortedData.length <= CHART_CONFIG.MAX_DATA_POINTS) {
      return sortedData;
    }

    const step = Math.ceil(sortedData.length / CHART_CONFIG.MAX_DATA_POINTS);
    return sortedData.filter((_, index) => index % step === 0);
  }, [propData, timePeriod]);

  const formatTime = useCallback(
    (timeStr: string): string => {
      if (!timeStr) return "";

      try {
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) return "";

        const formatOptions: Intl.DateTimeFormatOptions =
          timePeriod === "24h"
            ? { hour: "numeric", minute: "2-digit", hour12: true }
            : timePeriod === "7d" || timePeriod === "30d"
              ? { month: "short", day: "numeric" }
              : { month: "short", year: "numeric" };

        if (timePeriod === "24h") {
          return date.toLocaleTimeString("en-US", formatOptions);
        }

        return date.toLocaleDateString("en-US", formatOptions);
      } catch {
        return "";
      }
    },
    [timePeriod],
  );

  const CustomTooltip = useCallback<FC<CustomTooltipProps>>(
    ({ active, payload, label }) => {
      if (!active || !payload?.length || !label) return null;

      try {
        const date = new Date(label);
        if (isNaN(date.getTime())) return null;

        const formattedDate = formatTime(label);
        const value = payload[0]?.value;

        return (
          <div
            className="rounded-md border bg-white py-2 shadow-xs"
            role="tooltip"
          >
            <p className="text-foreground m-0 px-3 text-sm font-normal">
              {formattedDate}
            </p>
            <Separator className="my-1 px-0" />
            <div className="text-foreground m-0 flex items-center gap-2 px-3 text-sm">
              <div
                className="h-2 w-2"
                style={{ backgroundColor: theme.primary }}
              />
              <span>{theme.label}:</span>
              {formatNumber(value!)}
            </div>
          </div>
        );
      } catch {
        return null;
      }
    },
    [formatTime, theme.label, theme.primary],
  );

  const tickCount = CHART_CONFIG.TICK_COUNTS[timePeriod] ?? 6;

  return (
    <Card className="w-full border p-0 shadow-none">
      <CardHeader className="relative grid grid-cols-2 gap-0 px-0">
        <button
          type="button"
          onClick={() => selectEvent("clicks")}
          className={cn(
            "flex h-full w-full cursor-pointer flex-col items-baseline gap-2 border-r border-b p-4 text-left text-[28px] font-medium transition-opacity sm:p-6",
            !isFunnel && event !== "clicks" && "opacity-50 hover:opacity-80",
            isFunnel && "opacity-100",
          )}
        >
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-normal sm:text-sm">
            <div
              className="h-2.5 w-2.5 sm:mb-1"
              style={{ backgroundColor: EVENT_THEME.clicks.primary }}
            />
            <span>Clicks</span>
          </div>
          <NumberFlow
            value={propTotalClicks ?? 0}
            format={{ maximumFractionDigits: 0 }}
            className="text-2xl sm:text-3xl"
          />
        </button>
        <button
          type="button"
          onClick={() => selectEvent("leads")}
          className={cn(
            "flex h-full w-full cursor-pointer flex-col items-baseline gap-2 border-b p-4 text-left text-[28px] font-medium transition-opacity sm:p-6",
            !isFunnel && event !== "leads" && "opacity-50 hover:opacity-80",
            isFunnel && "opacity-100",
          )}
        >
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-normal sm:text-sm">
            <div
              className="h-2.5 w-2.5 sm:mb-1"
              style={{ backgroundColor: EVENT_THEME.leads.primary }}
            />
            <span>Leads</span>
          </div>
          {propTotalLeads == null ? (
            <span className="text-muted-foreground text-2xl sm:text-3xl">
              0
            </span>
          ) : (
            <NumberFlow
              value={propTotalLeads}
              format={{ maximumFractionDigits: 0 }}
              className="text-2xl sm:text-3xl"
            />
          )}
        </button>
      </CardHeader>
      <CardContent className="relative p-0 pr-2 pb-4">
        <div className="border-border absolute top-3 right-3 z-20 flex overflow-hidden rounded-md border bg-white">
          <button
            type="button"
            onClick={() => selectView("timeseries")}
            aria-label="Time series chart"
            className={cn(
              "grid size-8 place-items-center transition-colors",
              !isFunnel
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <LineChart className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => selectView("funnel")}
            aria-label="Conversion funnel"
            className={cn(
              "grid size-8 place-items-center border-l transition-colors",
              isFunnel
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Milestone className="size-3.5" />
          </button>
        </div>

        <div className="relative h-[320px] w-full sm:h-[500px]">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-transparent">
              <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          )}
          {!isLoading && isRefreshing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-transparent">
              <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          )}
          {error && (
            <div className="bg-background/10 absolute inset-0 z-10 flex items-center justify-center">
              <div className="text-center">
                <TriangleAlert className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  Failed to load chart data
                </p>
              </div>
            </div>
          )}

          {isFunnel ? (
            !isLoading && !error ? (
              <FunnelChart
                clicks={propTotalClicks ?? 0}
                leads={propTotalLeads ?? 0}
              />
            ) : null
          ) : processedData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={processedData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id={theme.gradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={theme.primary}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="50%"
                      stopColor={theme.primary}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={theme.primary}
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
                  tickCount={tickCount}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  domain={[0, "auto"]}
                  tickFormatter={(value) => formatNumber(Number(value))}
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
                  stroke={theme.primary}
                  fill={`url(#${theme.gradientId})`}
                  strokeWidth={1.5}
                  activeDot={{
                    r: 5,
                    strokeWidth: 1,
                    stroke: "#fff",
                    fill: theme.primary,
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
