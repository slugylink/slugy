"use client";
import React, { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotoGlobeShowingAmericas } from "@/utils/icons/globe-icon";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import useSWR from "swr";
import { fetchGeoData } from "@/server/actions/analytics/use-analytics";
import TableCard from "./table-card";

// Table header component to avoid repetition
function TableHeader({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center border-b pb-2">
      <div className="flex-1 text-sm">{label}</div>
      <div className="min-w-[80px] text-right text-sm">Clicks</div>
    </div>
  );
}

interface GeoclicksProps {
  workspaceslug: string;
  searchParams: Record<string, string>;
}

interface GeoData {
  country?: string;
  city?: string;
  continent?: string;
  clicks: number;
}

// Helper for ISO code normalization, translation, and flag link
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

// Continent map (same as before)
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

const Geoclicks = ({ workspaceslug, searchParams }: GeoclicksProps) => {
  const [activeTab, setActiveTab] = useState<
    "countries" | "cities" | "continents"
  >("countries");

  const [cache, setCache] = useState<Record<string, GeoData[]>>({});

  const swrKey = ["geo", workspaceslug, activeTab, searchParams];
  const { data, error, isLoading } = useSWR<GeoData[], Error>(
    swrKey,
    () => fetchGeoData(workspaceslug, searchParams, activeTab),
    {
      onSuccess: (newData) => {
        setCache((prev) => ({ ...prev, [activeTab]: newData }));
      },
    },
  );

  // Use cached data if available to avoid refetch lag
  const displayedData = cache[activeTab] ?? data ?? [];

  // Sorted data descending by clicks
  const sortedData = useMemo(
    () => [...displayedData].sort((a, b) => b.clicks - a.clicks),
    [displayedData],
  );

  const { getCountryInfo } = useCountryTools();

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <Tabs
          defaultValue="countries"
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="countries">Countries</TabsTrigger>
            <TabsTrigger value="cities">Cities</TabsTrigger>
            <TabsTrigger value="continents">Continents</TabsTrigger>
          </TabsList>

          {/* Countries Tab */}
          <TabsContent value="countries" className="mt-1 font-normal">
            <ScrollArea
              className="h-72 w-full"
              role="list"
              aria-label="Clicks by country"
            >
              <div>
                <TableHeader label="Country" />
                <TableCard
                  data={sortedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="country"
                  getClicks={(item) => item.clicks}
                  getKey={(item, index) =>
                    item.country ? item.country : `country-${index}`
                  }
                  progressColor="bg-green-200/40"
                  renderName={(item) => {
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
                  }}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Cities Tab */}
          <TabsContent value="cities" className="mt-1 font-normal">
            <ScrollArea
              className="h-72 w-full"
              role="list"
              aria-label="Clicks by city"
            >
              <div>
                <TableHeader label="City" />
                <TableCard
                  data={sortedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="city"
                  getClicks={(item) => item.clicks}
                  getKey={(item, index) =>
                    item.city ? item.city : `city-${index}`
                  }
                  progressColor="bg-green-200/40"
                  renderName={(item) => {
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
                  }}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Continents Tab */}
          <TabsContent value="continents" className="mt-1 font-normal">
            <ScrollArea
              className="h-72 w-full"
              role="list"
              aria-label="Clicks by continent"
            >
              <div>
                <TableHeader label="Continent" />
                <TableCard
                  data={sortedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="continent"
                  getClicks={(item) => item.clicks}
                  getKey={(item, index) =>
                    item.continent ? item.continent : `continent-${index}`
                  }
                  progressColor="bg-green-200/40"
                  renderName={(item) => {
                    const code = (item.continent ?? "").toLowerCase();
                    const name = CONTINENT_NAMES[code] || code || "Unknown";
                    return (
                      <div className="flex items-center gap-x-2 capitalize">
                        <NotoGlobeShowingAmericas />
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

export default Geoclicks;
