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
import CountryFlag from "./country-flag";
import ContinentFlag from "./continent-flag";
import { NotoGlobeShowingAmericas } from "@/utils/icons/globe-icon";
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

const Geoclicks = ({ workspaceslug, searchParams }: GeoclicksProps) => {
  const [activeTab, setActiveTab] = useState<
    "countries" | "cities" | "continents"
  >("countries");

  const { data, error, isLoading } = useSWR<GeoData[], Error>(
    ["geo", workspaceslug, activeTab, searchParams],
    () => fetchGeoData(workspaceslug, searchParams, activeTab),
  );

  // Pre-sort the data by clicks (descending) for better user experience
  const sortedData = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.clicks - a.clicks),
    [data],
  );

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

          {/* countries */}
          <TabsContent value="countries" className="mt-1 font-normal">
            <ScrollArea className="h-72 w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="">Country</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="space-y-1">
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-72">
                        <div className="flex h-full items-center justify-center">
                          <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {sortedData.map((country) => {
                        const maxClicks = sortedData[0]?.clicks ?? 1;
                        const widthPercentage =
                          (country.clicks / maxClicks) * 100;
                        return (
                          <TableRow
                            key={`country-${country.country}`}
                            className="bg-background relative border-none"
                          >
                            <TableCell className="relative z-10 capitalize">
                              <CountryFlag code={country.country ?? ""} />
                            </TableCell>
                            <TableCell className="relative z-10 text-right">
                              {formatNumber(country.clicks)}
                            </TableCell>
                            <div
                              className="absolute inset-y-0 left-0 my-auto h-[85%] rounded-md bg-emerald-200/40 dark:bg-emerald-950/50"
                              style={{ width: `${widthPercentage}%` }}
                            />
                          </TableRow>
                        );
                      })}
                      {(sortedData.length === 0 || error) && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="py-4 text-center text-gray-500"
                          >
                            No country data available
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* City */}
          <TabsContent value="cities" className="mt-1">
            <ScrollArea className="h-72 w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="space-y-1">
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-72">
                        <div className="flex h-full items-center justify-center">
                          <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {sortedData.map((city) => {
                        const maxClicks = sortedData[0]?.clicks ?? 1;
                        const widthPercentage = (city.clicks / maxClicks) * 100;
                        return (
                          <TableRow
                            key={`city-${city.city}-${city.country}`}
                            className="bg-background relative border-none"
                          >
                            <TableCell className="relative z-10">
                              <div className="flex items-center gap-x-2 capitalize">
                                <CountryFlag
                                  allowCountry={false}
                                  code={city.country ?? ""}
                                />
                                <span>{city.city}</span>
                              </div>
                            </TableCell>
                            <TableCell className="relative z-10 text-right">
                              {formatNumber(city.clicks)}
                            </TableCell>
                            <div
                              className="absolute inset-y-0 left-0 my-auto h-[85%] rounded-md bg-emerald-200/40 dark:bg-emerald-950/50"
                              style={{ width: `${widthPercentage}%` }}
                            />
                          </TableRow>
                        );
                      })}
                      {(sortedData.length === 0 || error) && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="py-4 text-center text-gray-500"
                          >
                            No city data available
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Continent */}
          <TabsContent value="continents" className="mt-1">
            <ScrollArea className="h-72 w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Continent</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="space-y-1">
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-72">
                        <div className="flex h-full items-center justify-center">
                          <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {sortedData.map((continent) => {
                        const maxClicks = sortedData[0]?.clicks ?? 1;
                        const widthPercentage =
                          (continent.clicks / maxClicks) * 100;
                        return (
                          <TableRow
                            key={`continent-${continent.continent}`}
                            className="bg-background relative border-none"
                          >
                            <TableCell className="relative z-10">
                              <div className="flex items-center gap-x-2 capitalize">
                                <NotoGlobeShowingAmericas />
                                <ContinentFlag
                                  code={continent.continent ?? ""}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="relative z-10 text-right">
                              {formatNumber(continent.clicks)}
                            </TableCell>
                            <div
                              className="absolute inset-y-0 left-0 my-auto h-[85%] rounded-md bg-emerald-200/40 dark:bg-emerald-950/50"
                              style={{ width: `${widthPercentage}%` }}
                            />
                          </TableRow>
                        );
                      })}
                      {(sortedData.length === 0 || error) && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="py-4 text-center text-gray-500"
                          >
                            No continent data available
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

export default Geoclicks;
