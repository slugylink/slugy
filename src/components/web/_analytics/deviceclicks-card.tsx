"use client";
import React, { memo, useState, useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import Image from "next/image";
import useSWR from "swr";
import { fetchDeviceData } from "@/server/actions/analytics/use-analytics";
import { LoaderCircle } from "@/utils/icons/loader-circle";

interface DeviceClicksProps {
  workspaceslug: string;
  searchParams: Record<string, string>;
}

interface DeviceData {
  device?: string;
  browser?: string;
  os?: string;
  clicks: number;
}

// Helper function to format names for URL
const formatNameForUrl = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, "-");
};

interface DeviceTableProps<T> {
  data: T[];
  loading: boolean;
  error?: Error;
  keyPrefix: string;
  renderName: (item: T) => React.ReactNode;
}

function DeviceTable<T extends DeviceData>({
  data,
  loading,
  error,
  keyPrefix,
  renderName,
}: DeviceTableProps<T>) {
  const maxClicks = data[0]?.clicks ?? 1;

  if (loading) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={2} className="h-60 py-4 text-center text-gray-500">
            <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin mx-auto" />
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (error || data.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={2} className="h-60 py-4 text-center text-gray-500">
            No data available
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody className="space-y-1">
      {data.map((item, index) => {
        const widthPercentage = (item.clicks / maxClicks) * 100;
        const keyId =
          (item.device ?? item.browser ?? item.os) || `${keyPrefix}-${index}`;
        return (
          <TableRow
            key={`${keyPrefix}-${keyId}`}
            className="relative border-none"
          >
            <TableCell className="relative z-10">
              {renderName(item)}
            </TableCell>
            <TableCell className="relative z-10 text-right">
              {formatNumber(item.clicks)}
            </TableCell>
            <span
              className="absolute inset-y-0 left-0 my-auto h-[85%] rounded-md bg-sky-200/40 dark:bg-sky-950/50"
              style={{ width: `${widthPercentage}%` }}
              aria-hidden="true"
            />
          </TableRow>
        );
      })}
    </TableBody>
  );
}

// Reusable Optimized Image Component
const OptimizedImage = memo(({ src, alt }: { src: string; alt: string }) => {
  const [loading, setLoading] = useState(true);
  const fallbackSrc =
    "https://slugylink.github.io/slugy-assets/dist/colorful/browser/default.svg";

  return (
    <Image
      src={src}
      alt={alt}
      width={16}
      height={16}
      loading="lazy"
      onLoad={() => setLoading(false)}
      className={cn(loading ? "blur-[2px]" : "blur-0", "transition-all")}
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallbackSrc;
      }}
    />
  );
});

OptimizedImage.displayName = "OptimizedImage";

const DeviceClicks = ({ workspaceslug, searchParams }: DeviceClicksProps) => {
  const [activeTab, setActiveTab] = useState<"devices" | "browsers" | "os">(
    "devices",
  );

  const { data, error, isLoading } = useSWR<DeviceData[], Error>(
    ["device", workspaceslug, activeTab, searchParams],
    () => fetchDeviceData(workspaceslug, searchParams, activeTab),
  );

  // Pre-sort the data by clicks (descending) for better user experience
  const sortedData = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.clicks - a.clicks),
    [data],
  );

  // Asset base URLs
  const baseAssetUrl = "https://slugylink.github.io/slugy-assets/dist/colorful";

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <Tabs
          defaultValue="devices"
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="browsers">Browsers</TabsTrigger>
            <TabsTrigger value="os">OS</TabsTrigger>
          </TabsList>

          {/* Devices Tab */}
          <TabsContent value="devices" className="mt-1">
            <ScrollArea className="h-72 w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <DeviceTable
                  data={sortedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="device"
                  renderName={(item) => {
                    const deviceName = item.device ?? "unknown";
                    const formattedDeviceName = formatNameForUrl(deviceName);
                    return (
                      <div className="flex items-center gap-x-2">
                        <OptimizedImage
                          src={`${baseAssetUrl}/device/${formattedDeviceName}.svg`}
                          alt={deviceName}
                        />
                        <span className="capitalize">{deviceName}</span>
                      </div>
                    );
                  }}
                />
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Browsers Tab */}
          <TabsContent value="browsers" className="mt-1">
            <ScrollArea className="h-72 w-full">
              <Table>
                <TableHeader>
                  <TableRow className="text-muted-foreground">
                    <TableHead className="">Browser</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <DeviceTable
                  data={sortedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="browser"
                  renderName={(item) => {
                    const browserName = item.browser ?? "unknown";
                    const formattedBrowserName = formatNameForUrl(browserName);
                    return (
                      <div className="flex items-center gap-x-2 capitalize">
                        <OptimizedImage
                          src={`${baseAssetUrl}/browser/${formattedBrowserName}.svg`}
                          alt={browserName}
                        />
                        <span>{browserName}</span>
                      </div>
                    );
                  }}
                />
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* OS Tab */}
          <TabsContent value="os" className="mt-1">
            <ScrollArea className="h-72 w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OS</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <DeviceTable
                  data={sortedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="os"
                  renderName={(item) => {
                    const osName = item.os ?? "unknown";
                    const formattedOsName = formatNameForUrl(osName);
                    return (
                      <div className="flex items-center gap-x-2 capitalize">
                        <OptimizedImage
                          src={`${baseAssetUrl}/os/${formattedOsName}.svg`}
                          alt={osName}
                        />
                        <span>{osName}</span>
                      </div>
                    );
                  }}
                />
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
};

export default DeviceClicks;
