"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import useSWR from "swr";
import { fetchChartData } from "@/server/actions/analytics/use-analytics";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { TriangleAlert } from "lucide-react";

interface ChartProps {
  data?: {
    time: Date;
    clicks: number;
  }[];
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

interface ChartDataResponse {
  clicksOverTime: {
    time: Date;
    clicks: number;
  }[];
  totalClicks: number;
}

// Chart theme values
const CHART_THEME = {
  primary: "#EA877E", // rose-400
  background: "hsl(var(--background))",
  border: "hsl(var(--border))",
  foreground: "hsl(var(--foreground))",
  muted: "hsl(var(--muted-foreground))",
};

// Time format mapping type with strict typing
// interface TimeFormatMap {
//   "24h": { axis: string; tooltip: string };
//   "7d": { axis: string; tooltip: string };
//   "30d": { axis: string; tooltip: string };
//   "3m": { axis: string; tooltip: string };
//   "12m": { axis: string; tooltip: string };
//   all: { axis: string; tooltip: string };
// }

const AnalyticsChart = ({
  data: propData,
  totalClicks: propTotalClicks,
  timePeriod = "24h",
  workspaceslug,
  searchParams,
}: ChartProps) => {
  const [localData, setLocalData] = useState<ChartDataPoint[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);

  const {
    data: swrData,
    isLoading,
    error,
  } = useSWR<ChartDataResponse, Error>(
    workspaceslug ? ["chart", workspaceslug, timePeriod, searchParams] : null,
    () =>
      fetchChartData(workspaceslug!, {
        time_period: timePeriod,
        ...searchParams,
      }),
  );

  // Update local data when new data arrives
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

      // Sort and sample data if needed
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

  // Time format mapping based on time period
  // const timeFormatMap = useMemo<TimeFormatMap>(
  //   () => ({
  //     "24h": {
  //       axis: "h:mm A",
  //       tooltip: "MMM DD, h:mm A",
  //     },
  //     "7d": {
  //       axis: "MMM DD",
  //       tooltip: "MMM DD",
  //     },
  //     "30d": {
  //       axis: "MMM DD",
  //       tooltip: "MMM DD",
  //     },
  //     "3m": {
  //       axis: "MMM YYYY",
  //       tooltip: "MMM, YYYY",
  //     },
  //     "12m": {
  //       axis: "MMM YYYY",
  //       tooltip: "MMM, YYYY",
  //     },
  //     all: {
  //       axis: "MMM YYYY",
  //       tooltip: "MMM, YYYY",
  //     },
  //   }),
  //   [],
  // );

  // Format time for axis display
  const formatTime = (timeStr: string): string => {
    if (!timeStr) return "";
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) {
        console.warn("Invalid date:", timeStr);
        return "";
      }

      // For 24h period, show time
      if (timePeriod === "24h") {
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }

      // For 7d and 30d, show date
      if (timePeriod === "7d" || timePeriod === "30d") {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }

      // For 3m, 12m, and all, show month and year
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    } catch (error) {
      console.error("Error formatting time:", error);
      return "";
    }
  };

  // Custom tooltip component
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
      if (isNaN(date.getTime())) {
        console.warn("Invalid date in tooltip:", label);
        return null;
      }

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
          className="bg-background rounded-md border p-2 shadow-sm"
          style={{
            backgroundColor: CHART_THEME.background,
            border: `1px solid ${CHART_THEME.border}`,
          }}
        >
          <p
            className="m-0 text-sm font-normal"
            style={{ color: CHART_THEME.foreground }}
          >
            {formattedDate}
          </p>
          <p className="m-0 text-sm" style={{ color: CHART_THEME.foreground }}>
            <span className="font-normal">Clicks:</span> {formatNumber(clicks!)}
          </p>
        </div>
      );
    } catch (error) {
      console.error("Error in tooltip:", error);
      return null;
    }
  };

  // Calculate appropriate tick count based on time period
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
      <CardHeader className="px-4 pt-2">
        <CardTitle className="flex w-fit cursor-pointer items-baseline gap-2 text-3xl font-semibold">
          {formatNumber(totalClicks)}
          <span className="text-muted-foreground text-base font-normal">
            Clicks
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pr-2 pb-2">
        <div className="relative h-[300px] w-full sm:h-[400px]">
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
                  style={{ fontSize: "11px", fill: CHART_THEME.muted }}
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
                  style={{ fontSize: "11px", fill: CHART_THEME.muted }}
                  width={30}
                />

                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />

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
            <></>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsChart;
