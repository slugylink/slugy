"use client";
import React, { memo, useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import Image from "next/image";
import useSWR from "swr";
import { fetchDeviceData } from "@/server/actions/analytics/use-analytics";
import TableCard from "./table-card";

// Asset base URLs
const BASE_ASSET_URL = "https://slugylink.github.io/slugy-assets/dist/colorful";
const FALLBACK_SRC = `${BASE_ASSET_URL}/browser/default.svg`;

// Helper for consistent name formatting for asset URLs
const formatNameForUrl = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, "-");

// DRY table header component
function TableHeader({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center border-b pb-2">
      <div className="flex-1 text-sm">{label}</div>
      <div className="min-w-[80px] text-right text-sm">Clicks</div>
    </div>
  );
}

// OptimizedImage robust to loading and fallback
const OptimizedImage = memo(({ src, alt }: { src: string; alt: string }) => {
  const [loading, setLoading] = useState(true);
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
        // Fallback to default asset SVG
        (e.target as HTMLImageElement).src = FALLBACK_SRC;
      }}
    />
  );
});
OptimizedImage.displayName = "OptimizedImage";

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

const DeviceClicks = ({ workspaceslug, searchParams }: DeviceClicksProps) => {
  const [activeTab, setActiveTab] = useState<"devices" | "browsers" | "os">(
    "devices",
  );

  // Fetch device analytics (keyed by tab & params)
  const { data, error, isLoading } = useSWR<DeviceData[], Error>(
    ["device", workspaceslug, activeTab, searchParams],
    () => fetchDeviceData(workspaceslug, searchParams, activeTab),
  );

  // Always sort top-clicked first
  const sortedData = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.clicks - a.clicks),
    [data],
  );

  // Memo asset src resolver for each tab kind
  const getDeviceAsset = useMemo(
    () => ({
      device: (name: string) =>
        `${BASE_ASSET_URL}/device/${formatNameForUrl(name)}.svg`,
      browser: (name: string) =>
        `${BASE_ASSET_URL}/browser/${formatNameForUrl(name)}.svg`,
      os: (name: string) =>
        `${BASE_ASSET_URL}/os/${formatNameForUrl(name)}.svg`,
    }),
    [],
  );

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
            <ScrollArea
              className="h-72 w-full"
              role="list"
              aria-label="Clicks by device"
            >
              <div>
                <TableHeader label="Device" />
                <TableCard
                  data={sortedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="device"
                  getClicks={(item) => item.clicks}
                  getKey={(item, index) => item.device || `device-${index}`}
                  progressColor="bg-blue-200/40"
                  renderName={(item) => {
                    const name = item.device ?? "unknown";
                    return (
                      <div className="flex items-center gap-x-2">
                        <OptimizedImage
                          src={getDeviceAsset.device(name)}
                          alt={name}
                        />
                        <span className="capitalize">{name}</span>
                      </div>
                    );
                  }}
                />
              </div>
            </ScrollArea>
          </TabsContent>
          {/* Browsers Tab */}
          <TabsContent value="browsers" className="mt-1">
            <ScrollArea
              className="h-72 w-full"
              role="list"
              aria-label="Clicks by browser"
            >
              <div>
                <TableHeader label="Browser" />
                <TableCard
                  data={sortedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="browser"
                  getClicks={(item) => item.clicks}
                  getKey={(item, index) => item.browser || `browser-${index}`}
                  progressColor="bg-blue-200/40"
                  renderName={(item) => {
                    const name = item.browser ?? "unknown";
                    return (
                      <div className="flex items-center gap-x-2 capitalize">
                        <OptimizedImage
                          src={getDeviceAsset.browser(name)}
                          alt={name}
                        />
                        <span>{name}</span>
                      </div>
                    );
                  }}
                />
              </div>
            </ScrollArea>
          </TabsContent>
          {/* OS Tab */}
          <TabsContent value="os" className="mt-1">
            <ScrollArea
              className="h-72 w-full"
              role="list"
              aria-label="Clicks by OS"
            >
              <div>
                <TableHeader label="OS" />
                <TableCard
                  data={sortedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="os"
                  getClicks={(item) => item.clicks}
                  getKey={(item, index) => item.os || `os-${index}`}
                  progressColor="bg-blue-200/40"
                  renderName={(item) => {
                    const name = item.os ?? "unknown";
                    return (
                      <div className="flex items-center gap-x-2 capitalize">
                        <OptimizedImage
                          src={getDeviceAsset.os(name)}
                          alt={name}
                        />
                        <span>{name}</span>
                      </div>
                    );
                  }}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
};

export default DeviceClicks;
