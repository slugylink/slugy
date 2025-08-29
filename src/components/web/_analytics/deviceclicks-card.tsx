"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useAnalytics } from "@/hooks/use-analytics";
import TableCard from "./table-card";
import AnalyticsDialog from "./analytics-dialog";

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
  timePeriod: "24h" | "7d" | "30d" | "3m" | "12m" | "all";
  devicesData?: DeviceData[];
  browsersData?: DeviceData[];
  osesData?: DeviceData[];
  isLoading?: boolean;
}

interface DeviceData {
  device?: string;
  browser?: string;
  os?: string;
  clicks: number;
}

type TabKey = "devices" | "browsers" | "oses";

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
    key: "oses",
    label: "OS",
    dataKey: "os",
    getAssetSrc: (name) => `${BASE_ASSET_URL}/os/${formatNameForUrl(name)}.svg`,
  },
];

const DeviceClicks = ({
  workspaceslug,
  searchParams,
  timePeriod,
  devicesData,
  browsersData,
  osesData,
  isLoading: propIsLoading,
}: DeviceClicksProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>("devices");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Use the new analytics hook with selective metrics only if no data is passed
  const { devices: hookDevices, browsers: hookBrowsers, oses: hookOses, isLoading: hookLoading, error } = useAnalytics({
    workspaceslug,
    timePeriod,
    searchParams,
    metrics: ["devices", "browsers", "oses"], // Only fetch needed metrics
    enabled: !devicesData && !browsersData && !osesData, // Disable if data is passed
  });

  // Use passed data or fallback to hook data
  const devices = devicesData || hookDevices;
  const browsers = browsersData || hookBrowsers;
  const oses = osesData || hookOses;
  const isLoading = propIsLoading || hookLoading;

  // Get data based on active tab
  const currentData = useMemo(() => {
    switch (activeTab) {
      case "devices":
        return devices;
      case "browsers":
        return browsers;
      case "oses":
        return oses;
      default:
        return [];
    }
  }, [activeTab, devices, browsers, oses]);

  const sortedData = useMemo(
    () => [...currentData].sort((a, b) => b.clicks - a.clicks),
    [currentData],
  );

  const currentTabConfig = tabConfigs.find((tab) => tab.key === activeTab)!;

  // Type-safe helper function to get the value for the current tab
  const getTabValue = (item: DeviceData): string => {
    const value = item[currentTabConfig.dataKey];
    return (value as string) ?? "unknown";
  };

  const renderName = (item: DeviceData) => {
    const name = getTabValue(item);
    return (
      <div className={cn("flex items-center gap-x-2 capitalize")}>
        <OptimizedImage src={currentTabConfig.getAssetSrc(name)} alt={name} />
        <span>{name}</span>
      </div>
    );
  };

  return (
    <Card className="relative overflow-hidden border shadow-none">
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

          <TabsContent value={currentTabConfig.key} className="mt-1">
            <div
              className="relative h-72 w-full"
              role="list"
              aria-label={`Clicks by ${currentTabConfig.label.toLowerCase()}`}
            >
              <TableHeader label={currentTabConfig.label} />
              <TableCard
                data={sortedData.slice(0, 7)}
                loading={isLoading}
                error={error}
                keyPrefix={currentTabConfig.dataKey}
                getClicks={(item) => item.clicks}
                getKey={(item, index) => {
                  const value = getTabValue(item);
                  return value !== "unknown" ? value : `${currentTabConfig.key}-${index}`;
                }}
                progressColor="bg-blue-200/40"
                renderName={renderName}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <div className="absolute bottom-0 left-0 h-[50%] w-full bg-gradient-to-t from-white to-transparent"></div>

      <AnalyticsDialog
        data={sortedData}
        loading={isLoading}
        error={error}
        keyPrefix={currentTabConfig.dataKey}
        getClicks={(item) => item.clicks}
        getKey={(item, index) => {
          const value = getTabValue(item);
          return value !== "unknown" ? value : `${currentTabConfig.key}-${index}`;
        }}
        progressColor="bg-blue-200/40"
        renderName={renderName}
        title={currentTabConfig.label}
        headerLabel={currentTabConfig.label}
        showButton={!isLoading && sortedData.length > 7}
        dialogOpen={dialogOpen}
        onDialogOpenChange={setDialogOpen}
      />
    </Card>
  );
};

export default DeviceClicks;
