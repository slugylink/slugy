"use client";

import { useState, useEffect } from "react";
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
import useSWR from "swr";
// Function to fetch chart data from the API route
const fetchChartData = async (
  workspaceslug: string,
  params: Record<string, string>
) => {
  const searchParams = new URLSearchParams(params);
  const response = await fetch(`/api/workspace/${workspaceslug}/analytics?${searchParams}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch chart data: ${response.statusText}`);
  }
  
  const data = await response.json();
  return {
    clicksOverTime: data.clicksOverTime ?? [],
    totalClicks: data.totalClicks ?? 0,
  };
};
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
}

interface ChartDataPoint {
  time: string;
  timestamp: number;
  clicks: number;
}

interface ChartDataResponse {
  clicksOverTime: {
    time: Date;
    clicks: number;
  }[];
  totalClicks: number;
}

const CHART_THEME = {
  primary: "#EA877E",
  background: "hsl(var(--background))",
  border: "hsl(var(--border))",
  foreground: "hsl(var(--foreground))",
  muted: "hsl(var(--muted-foreground))",
};

const AnalyticsChart = ({
  data: propData,
  totalClicks: propTotalClicks,
  timePeriod = "24h",
  workspaceslug,
  searchParams,
}: ChartProps) => {
  const [localData, setLocalData] = useState<ChartDataPoint[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);

  // Optimize SWR key - only fetch when we have a workspace slug
  const shouldFetch = Boolean(workspaceslug);
  const swrKey = shouldFetch 
    ? ["analytics", "chart", workspaceslug, timePeriod, searchParams]
    : null;

  const {
    data: swrData,
    isLoading,
    error,
  } = useSWR<ChartDataResponse, Error>(
    swrKey,
    () => fetchChartData(workspaceslug!, {
      time_period: timePeriod,
      ...searchParams,
    }),
    {
      // Only revalidate when searchParams change significantly
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      // Keep previous data while loading new data
      keepPreviousData: true,
      // Dedupe requests within 10 seconds
      dedupingInterval: 10000,
    }
  );

  useEffect(() => {
    const dataToProcess = propData ?? swrData?.clicksOverTime;
    if (dataToProcess) {
      const formattedData = dataToProcess.map((item) => {
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
      const sampledData =
        sortedData.length > 500
          ? sortedData.filter(
              (_, index) => index % Math.ceil(sortedData.length / 500) === 0,
            )
          : sortedData;

      setLocalData(sampledData);
      setTotalClicks(propTotalClicks ?? swrData?.totalClicks ?? 0);
    }
  }, [propData, swrData, propTotalClicks]);

  const formatTime = (timeStr: string): string => {
    if (!timeStr) return "";
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return "";
      if (timePeriod === "24h") {
        return date.toLocaleTimeString("en-US", {
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
  };

  interface CustomTooltipProps extends TooltipProps<number, string> {
    active?: boolean;
    payload?: Array<{
      value: number;
      name: string;
      dataKey: string;
    }>;
    label?: string;
  }

  const CustomTooltip: React.FC<CustomTooltipProps> = ({
    active,
    payload,
    label,
  }) => {
    if (!active || !payload?.length || !label) return null;
    try {
      const date = new Date(label);
      if (isNaN(date.getTime())) return null;
      let formattedDate: string;
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
      const clicks = payload[0]?.value;
      return (
        <div
          className="rounded-md border bg-white py-2 shadow-xs"
          style={{
            backgroundColor: "#fff",
          }}
          role="tooltip"
        >
          <p
            className="m-0 px-3 text-sm font-normal"
            style={{ color: CHART_THEME.foreground }}
          >
            {formattedDate}
          </p>
          <Separator className="my-1 px-0" />
          <p
            className="m-0 px-3 text-sm"
            style={{ color: CHART_THEME.foreground }}
          >
            <span className="font-normal">Clicks:</span> {formatNumber(clicks!)}
          </p>
        </div>
      );
    } catch {
      return null;
    }
  };

  const getTickCount = (): number => {
    if (timePeriod === "24h") return 12;
    if (timePeriod === "7d") return 7;
    if (timePeriod === "30d") return 10;
    if (timePeriod === "3m") return 3;
    if (timePeriod === "12m") return 12;
    return 6;
  };

  return (
    <Card className="w-full border shadow-none">
      <CardHeader className="px-4">
        <CardTitle className="flex w-fit cursor-pointer items-baseline gap-2 text-[28px] font-medium">
          <NumberFlow value={totalClicks} format={{ maximumFractionDigits: 0 }} />
          <span className="text-muted-foreground text-sm font-normal">
            Clicks
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pr-2 pb-2">
        <div className="relative h-[300px] w-full sm:h-[420px]">
          {isLoading && (
            <div className="bg-background/10 absolute top-0 left-0 z-10 flex h-full w-full items-center justify-center">
              <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          )}
          {error && (
            <div className="bg-background/10 absolute top-0 left-0 z-10 flex h-full w-full items-center justify-center">
              <TriangleAlert className="text-muted-foreground h-5 w-5" />
            </div>
          )}
          {localData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={localData}
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
                  isAnimationActive={localData.length < 1000}
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
