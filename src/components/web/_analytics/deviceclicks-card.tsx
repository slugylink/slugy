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

  if (error) {
    return (
      <Card className="shadow-none border">
        <CardHeader className="pb-2">
          <div className="text-center text-destructive">
            Error loading device data
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Asset base URLs
  const baseAssetUrl = "https://slugylink.github.io/slugy-assets/dist/colorful";

  return (
    <Card className="shadow-none border">
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
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-72">
                        <div className="flex h-full items-center justify-center">
                          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {sortedData.map((data) => {
                        const deviceName = data.device ?? "unknown";
                        const formattedDeviceName =
                          formatNameForUrl(deviceName);
                        const maxClicks = sortedData[0]?.clicks ?? 1;
                        const widthPercentage = (data.clicks / maxClicks) * 100;

                        return (
                          <TableRow
                            key={`device-${formattedDeviceName}`}
                            className="relative border-none"
                          >
                            <TableCell className="relative z-10">
                              <div className="flex items-center gap-x-2">
                                <OptimizedImage
                                  src={`${baseAssetUrl}/device/${formattedDeviceName}.svg`}
                                  alt={deviceName}
                                />
                                <span className="capitalize">{deviceName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="relative z-10 text-right">
                              {formatNumber(data.clicks)}
                            </TableCell>
                            <div
                              className="absolute inset-y-0 left-0 my-auto h-[85%] rounded-md bg-sky-200/40 dark:bg-sky-950/50"
                              style={{ width: `${widthPercentage}%` }}
                            />
                          </TableRow>
                        );
                      })}
                      {sortedData.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="py-4 text-center text-gray-500"
                          >
                            No device data available
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Browsers Tab */}
          <TabsContent value="browsers" className="mt-1">
            <ScrollArea className="h-72 w-full  ">
              <Table>
                <TableHeader>
                  <TableRow className="text-muted-foreground">
                    <TableHead className="">Browser</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-72">
                        <div className="flex h-full items-center justify-center">
                          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {sortedData.map((data) => {
                        const browserName = data.browser ?? "unknown";
                        const formattedBrowserName =
                          formatNameForUrl(browserName);
                        const maxClicks = sortedData[0]?.clicks ?? 1;
                        const widthPercentage = (data.clicks / maxClicks) * 100;

                        return (
                          <TableRow
                            key={`browser-${formattedBrowserName}`}
                            className="relative border-none"
                          >
                            <TableCell className="relative z-10">
                              <div className="flex items-center gap-x-2">
                                <OptimizedImage
                                  src={`${baseAssetUrl}/browser/${formattedBrowserName}.svg`}
                                  alt={browserName}
                                />
                                <span>{browserName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="relative z-10 text-right">
                              {formatNumber(data.clicks)}
                            </TableCell>
                            <div
                              className="absolute inset-y-0 left-0 my-auto h-[85%] rounded-md bg-sky-200/40 dark:bg-sky-950/50"
                              style={{ width: `${widthPercentage}%` }}
                            />
                          </TableRow>
                        );
                      })}
                      {sortedData.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="py-4 text-center text-gray-500"
                          >
                            No browser data available
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* OS Tab */}
          <TabsContent value="os" className="mt-1">
            <ScrollArea className="h-72 w-full  ">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OS</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-72">
                        <div className="flex h-full items-center justify-center">
                          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {sortedData.map((data) => {
                        const osName = data.os ?? "unknown";
                        const formattedOsName = formatNameForUrl(osName);
                        const maxClicks = sortedData[0]?.clicks ?? 1;
                        const widthPercentage = (data.clicks / maxClicks) * 100;

                        return (
                          <TableRow
                            key={`os-${formattedOsName}`}
                            className="relative border-none"
                          >
                            <TableCell className="relative z-10">
                              <div className="flex items-center gap-x-2">
                                <OptimizedImage
                                  src={`${baseAssetUrl}/os/${formattedOsName}.svg`}
                                  alt={osName}
                                />
                                <span>{osName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="relative z-10 text-right">
                              {formatNumber(data.clicks)}
                            </TableCell>
                            <div
                              className="absolute inset-y-0 left-0 my-auto h-[85%] rounded-md bg-sky-200/40 dark:bg-sky-950/50"
                              style={{ width: `${widthPercentage}%` }}
                            />
                          </TableRow>
                        );
                      })}
                      {sortedData.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="py-4 text-center text-gray-500"
                          >
                            No OS data available
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
};

export default DeviceClicks;
