"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotoGlobeShowingAmericas } from "@/utils/icons/globe-icon";
import TableCard from "./table-card";
import AnalyticsDialog from "./analytics-dialog";

// ------------------------------
// Types
// ------------------------------
interface GeoclicksProps {
  workspaceslug: string;
  searchParams: Record<string, string>;
  timePeriod: "24h" | "7d" | "30d" | "3m" | "12m" | "all";
  citiesData?: GeoData[];
  countriesData?: GeoData[];
  continentsData?: GeoData[];
  isLoading?: boolean;
  error?: Error;
}

interface GeoData {
  country?: string;
  city?: string;
  continent?: string;
  clicks: number;
}

type GeoKey = keyof Pick<GeoData, "country" | "city" | "continent">;

interface TabConfig {
  key: "countries" | "cities" | "continents";
  label: string; // plural for tab labels
  singular: string; // singular for table header
  dataKey: GeoKey;
  renderName: (
    item: GeoData,
    getCountryInfo: ReturnType<typeof useCountryTools>["getCountryInfo"],
  ) => React.ReactElement;
}

// ------------------------------
// Helper Components
// ------------------------------
function TableHeader({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center border-b pb-2">
      <div className="flex-1 text-sm">{label}</div>
      <div className="min-w-[80px] text-right text-sm">Clicks</div>
    </div>
  );
}

// ------------------------------
// Country Tools hook
// ------------------------------
function useCountryTools() {
  const displayNames = useMemo(() => {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      return null;
    }
  }, []);

  function getCountryInfo(code?: string) {
    const lower = (code ?? "").toLowerCase();
    const valid = /^[a-z]{2}$/.test(lower);
    if (!valid) {
      return {
        name: "Unknown",
        flag: "https://img.icons8.com/color/16/flag--v1.png",
      };
    }
    const name = displayNames?.of(lower.toUpperCase()) ?? lower;
    return {
      name,
      flag: `https://flagcdn.com/w20/${lower}.png`,
    };
  }

  return { getCountryInfo };
}

// ------------------------------
// Static Data
// ------------------------------
const CONTINENT_NAMES: Record<string, string> = {
  af: "Africa",
  an: "Antarctica",
  as: "Asia",
  eu: "Europe",
  na: "North America",
  oc: "Oceania",
  sa: "South America",
  unknown: "Unknown",
};

const tabConfigs: TabConfig[] = [
  {
    key: "countries",
    label: "Countries",
    singular: "Country",
    dataKey: "country",
    renderName: (item, getCountryInfo) => {
      const { name, flag } = getCountryInfo(item.country);
      return (
        <div className="flex items-center gap-x-2">
          <Image
            src={flag}
            alt={`${name} flag`}
            width={20}
            height={15}
            style={{ borderRadius: 2 }}
            loading="lazy"
          />
          <span className="capitalize">{name}</span>
        </div>
      );
    },
  },
  {
    key: "cities",
    label: "Cities",
    singular: "City",
    dataKey: "city",
    renderName: (item, getCountryInfo) => {
      const { flag } = getCountryInfo(item.country);
      return (
        <div className="flex items-center gap-x-2 capitalize">
          <Image
            src={flag}
            alt={`${item.country ?? "Unknown"} flag`}
            width={20}
            height={15}
            style={{ borderRadius: 2 }}
            loading="lazy"
          />
          <span>{item.city ?? "Unknown"}</span>
        </div>
      );
    },
  },
  {
    key: "continents",
    label: "Continents",
    singular: "Continent",
    dataKey: "continent",
    renderName: (item) => {
      const code = (item.continent ?? "").toLowerCase();
      const name = CONTINENT_NAMES[code] || code || "Unknown";
      return (
        <div className="flex items-center gap-x-2 capitalize">
          <NotoGlobeShowingAmericas />
          <span>{name}</span>
        </div>
      );
    },
  },
];

// ------------------------------
// Main Component
// ------------------------------
const Geoclicks = ({
  citiesData,
  countriesData,
  continentsData,
  isLoading: propIsLoading,
  error,
}: GeoclicksProps) => {
  const [activeTab, setActiveTab] = useState<TabConfig["key"]>("countries");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Use the new analytics hook only if no data is passed

  // Use passed data or fallback to hook data
  const cities = citiesData;
  const countries = countriesData;
  const continents = continentsData;
  const isLoading = propIsLoading;

  // Get data based on active tab
  const currentData = useMemo(() => {
    switch (activeTab) {
      case "cities":
        return cities;
      case "countries":
        return countries;
      case "continents":
        return continents;
      default:
        return [];
    }
  }, [activeTab, cities, countries, continents]);

  const sortedData = useMemo(
    () => [...currentData!].sort((a, b) => b.clicks - a.clicks),
    [currentData],
  );

  const { getCountryInfo } = useCountryTools();
  const currentTabConfig = tabConfigs.find((tab) => tab.key === activeTab)!;

  return (
    <Card className="relative overflow-hidden border shadow-none">
      <CardHeader className="pb-2">
        <Tabs
          defaultValue="countries"
          onValueChange={(value) => setActiveTab(value as TabConfig["key"])}
        >
          {/* Tab buttons */}
          <TabsList className="grid w-full grid-cols-3">
            {tabConfigs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab panel */}
          <TabsContent
            value={currentTabConfig.key}
            className="mt-1 font-normal"
          >
            <div
              className="relative h-72 w-full"
              role="list"
              aria-label={`Clicks by ${currentTabConfig.label.toLowerCase()}`}
            >
              {/* Correct singular label */}
              <TableHeader label={currentTabConfig.singular} />
              <TableCard
                data={sortedData.slice(0, 7)}
                loading={isLoading ?? false}
                error={error}
                keyPrefix={currentTabConfig.key}
                dataKey={currentTabConfig.dataKey}
                getClicks={(item) => item.clicks}
                getKey={(item, index) =>
                  (
                    item as {
                      country: string;
                      city: string;
                      continent: string;
                      clicks: number;
                    }
                  )[currentTabConfig.dataKey] ??
                  `${currentTabConfig.dataKey}-${index}`
                }
                progressColor="bg-green-200/40"
                renderName={(item) =>
                  currentTabConfig.renderName(item, getCountryInfo)
                }
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardHeader>

      <div className="absolute bottom-0 left-0 h-[50%] w-full bg-gradient-to-t from-white to-transparent"></div>

      <AnalyticsDialog
        data={sortedData}
        loading={isLoading ?? false}
        error={error}
        keyPrefix={currentTabConfig.key}
        dataKey={currentTabConfig.dataKey}
        getClicks={(item) => item.clicks}
        getKey={(item, index) =>
          (
            item as {
              country: string;
              city: string;
              continent: string;
              clicks: number;
            }
          )[currentTabConfig.dataKey] ?? `${currentTabConfig.dataKey}-${index}`
        }
        progressColor="bg-green-200/40"
        renderName={(item) => currentTabConfig.renderName(item, getCountryInfo)}
        title={currentTabConfig.label}
        headerLabel={currentTabConfig.singular}
        showButton={!(isLoading ?? false) && sortedData.length > 7}
        dialogOpen={dialogOpen}
        onDialogOpenChange={setDialogOpen}
      />
    </Card>
  );
};

export default Geoclicks;
