"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import Image from "next/image";
import useSWR from "swr";
import { fetchDeviceData } from "@/server/actions/analytics/use-analytics";
import TableCard from "./table-card";

// Asset base URLs and helpers
const BASE_ASSET_URL = "https://slugylink.github.io/slugy-assets/dist/colorful";
const FALLBACK_SRC = `${BASE_ASSET_URL}/browser/default.svg`;

const formatNameForUrl = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, "-");

function TableHeader({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center border-b pb-2">
      <div className="flex-1 text-sm">{label}</div>
      <div className="min-w-[80px] text-right text-sm">Clicks</div>
    </div>
  );
}

const OptimizedImage = React.memo(
  ({ src, alt }: { src: string; alt: string }) => {
    const [loading, setLoading] = React.useState(true);

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
          (e.target as HTMLImageElement).src = FALLBACK_SRC;
        }}
      />
    );
  },
);
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

type TabKey = "devices" | "browsers" | "os";

interface TabConfig {
  key: TabKey;
  label: string;
  dataKey: keyof DeviceData;
  getAssetSrc: (name: string) => string;
}

const tabConfigs: TabConfig[] = [
  {
    key: "devices",
    label: "Devices",
    dataKey: "device",
    getAssetSrc: (name) =>
      `${BASE_ASSET_URL}/device/${formatNameForUrl(name)}.svg`,
  },
  {
    key: "browsers",
    label: "Browsers",
    dataKey: "browser",
    getAssetSrc: (name) =>
      `${BASE_ASSET_URL}/browser/${formatNameForUrl(name)}.svg`,
  },
  {
    key: "os",
    label: "OS",
    dataKey: "os",
    getAssetSrc: (name) => `${BASE_ASSET_URL}/os/${formatNameForUrl(name)}.svg`,
  },
];

const DeviceClicks = ({ workspaceslug, searchParams }: DeviceClicksProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>("devices");

  const { data, error, isLoading } = useSWR<DeviceData[], Error>(
    ["device", workspaceslug, activeTab, searchParams],
    () => fetchDeviceData(workspaceslug, searchParams, activeTab),
  );

  const sortedData = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.clicks - a.clicks),
    [data],
  );

  return (
    <Card className="border shadow-none">
      <CardContent className="pb-2">
        <Tabs
          defaultValue="devices"
          onValueChange={(value) => setActiveTab(value as TabKey)}
        >
          <TabsList className="grid w-full grid-cols-3">
            {tabConfigs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabConfigs.map((tab) => (
            <TabsContent value={tab.key} key={tab.key} className="mt-1">
              <ScrollArea
                className="h-72 w-full"
                role="list"
                aria-label={`Clicks by ${tab.label.toLowerCase()}`}
              >
                <div>
                  <TableHeader label={tab.label} />
                  <TableCard
                    data={sortedData}
                    loading={isLoading}
                    error={error}
                    keyPrefix={tab.dataKey}
                    getClicks={(item) => item.clicks}
                    getKey={(item, index) =>
                      (item[tab.dataKey] as string | undefined) ??
                      `${tab.key}-${index}`
                    }
                    progressColor="bg-blue-200/40"
                    renderName={(item) => {
                      const name = (item[tab.dataKey] as string) ?? "unknown";
                      return (
                        <div
                          className={cn("flex items-center gap-x-2 capitalize")}
                        >
                          <OptimizedImage
                            src={tab.getAssetSrc(name)}
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
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DeviceClicks;
