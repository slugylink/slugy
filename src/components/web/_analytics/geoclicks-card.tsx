"use client";
import React, { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotoGlobeShowingAmericas } from "@/utils/icons/globe-icon";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatNumber } from "@/lib/format-number";
import useSWR from "swr";
import { fetchGeoData } from "@/server/actions/analytics/use-analytics";
import { LoaderCircle } from "@/utils/icons/loader-circle";

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

interface GeoTableProps<T> {
  data: T[];
  loading: boolean;
  error?: Error;
  keyPrefix: string;
  renderName: (item: T) => React.ReactNode;
}

function GeoTable<T extends GeoData>({
  data,
  loading,
  error,
  keyPrefix,
  renderName,
}: GeoTableProps<T>) {
  const maxClicks = data[0]?.clicks ?? 1;

  if (loading) {
    return (
      <TableBody>
        <TableRow>
          <TableCell
            colSpan={2}
            className="h-60 py-4 text-center text-gray-500"
          >
            <LoaderCircle className="text-muted-foreground mx-auto h-5 w-5 animate-spin" />
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (error || data.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell
            colSpan={2}
            className="h-60 py-4 text-center text-gray-500"
          >
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
          item.country ??
          item.city ??
          item.continent ??
          `${keyPrefix}-${index}`; // fallback key

        return (
          <TableRow
            key={`${keyPrefix}-${keyId}`}
            className="bg-background relative border-none"
          >
            <TableCell className="relative z-10 capitalize">
              {renderName(item)}
            </TableCell>
            <TableCell className="relative z-10 text-right">
              {formatNumber(item.clicks)}
            </TableCell>
            <div
              className="absolute inset-y-0 left-0 my-auto h-[85%] rounded-md bg-emerald-200/40 dark:bg-emerald-950/50"
              style={{ width: `${widthPercentage}%` }}
              aria-hidden="true"
            />
          </TableRow>
        );
      })}
    </TableBody>
  );
}

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
    }
  );

  // Use cached data if available to avoid refetch lag
  const displayedData = cache[activeTab] ?? data ?? [];

  // Sorted data descending by clicks
  const sortedData = useMemo(
    () => [...displayedData].sort((a, b) => b.clicks - a.clicks),
    [displayedData],
  );

  // Memoized Intl.DisplayNames for country code translation
  const displayNames = useMemo(() => {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      return null;
    }
  }, []);

  // Mapping from continent code to full name
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

  // Helper to validate ISO country code
  const isValidCountryCode = (code?: string) => {
    return /^[a-z]{2}$/.test(code ?? "");
  };

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
            <ScrollArea className="h-72 w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <GeoTable
                  data={sortedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="country"
                  renderName={(item) => {
                    const code = (item.country ?? "").toLowerCase();
                    const countryName =
                      code === "unknown" || code === ""
                        ? "Unknown"
                        : displayNames?.of(code.toUpperCase()) ?? code;

                    const flagSrc = isValidCountryCode(code)
                      ? `https://flagcdn.com/w20/${code}.png`
                      : "https://img.icons8.com/officexs/16/flag.png";

                    return (
                      <div className="flex items-center gap-x-2">
                        <Image
                          src={flagSrc}
                          alt={`${countryName} flag`}
                          width={20}
                          height={15}
                          style={{ borderRadius: 2 }}
                          loading="lazy"
                        />
                        <span className="capitalize">{countryName}</span>
                      </div>
                    );
                  }}
                />
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Cities Tab */}
          <TabsContent value="cities" className="mt-1 font-normal">
            <ScrollArea className="h-72 w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <GeoTable
                  data={sortedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="city"
                  renderName={(item) => {
                    const countryCode = (item.country ?? "").toLowerCase();
                    const flagSrc = isValidCountryCode(countryCode)
                      ? `https://flagcdn.com/w20/${countryCode}.png`
                      : "https://img.icons8.com/officexs/16/flag.png";

                    return (
                      <div className="flex items-center gap-x-2 capitalize">
                        <Image
                          src={flagSrc}
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
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Continents Tab */}
          <TabsContent value="continents" className="mt-1 font-normal">
            <ScrollArea className="h-72 w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Continent</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <GeoTable
                  data={sortedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="continent"
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
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
};

export default Geoclicks;
