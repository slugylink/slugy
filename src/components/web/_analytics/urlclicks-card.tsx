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
import { ScrollArea } from "@/components/ui/scroll-area";
import UrlAvatar from "@/components/web/url-avatar";
import { formatNumber } from "@/lib/format-number";
import useSWR from "swr";
import { fetchUrlClicksData } from "@/server/actions/analytics/use-analytics";
import { LoaderCircle } from "@/utils/icons/loader-circle";

interface UrlClicksProps {
  workspaceslug: string;
  searchParams: Record<string, string>;
}

interface UrlClickData {
  slug: string;
  url: string;
  clicks: number;
}

const UrlClicks = ({ workspaceslug, searchParams }: UrlClicksProps) => {
  const { data, error, isLoading } = useSWR<UrlClickData[], Error>(
    ["url-clicks", workspaceslug, searchParams],
    () => fetchUrlClicksData(workspaceslug, searchParams),
  );

  // Pre-sort the data by clicks (descending) for better user experience
  const sortedData = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.clicks - a.clicks),
    [data],
  );

  const [activeTab, setActiveTab] = useState<"short-links" | "destination-links">("short-links");

  if (error) {
    return (
      <Card className="shadow-none border">
        <CardHeader className="pb-2">
          <div className="text-destructive">Error loading URL clicks data</div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-none border">
      <CardHeader className="pb-2">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="short-links">Short Links</TabsTrigger>
            <TabsTrigger value="destination-links">
              Destination URLs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="short-links" className="mt-1">
            <ScrollArea className="h-72 w-full  ">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Link</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                      {sortedData.map((item) => {
                        const maxClicks = sortedData[0]?.clicks ?? 1;
                        const widthPercentage = (item.clicks / maxClicks) * 100;

                        return (
                          <TableRow
                            key={`short-${item.slug}`}
                            className="relative border-none"
                          >
                            <TableCell className="relative z-10 line-clamp-1 border-none">
                              <div className="flex items-center gap-x-2">
                                <UrlAvatar
                                  className="rounded-sm"
                                  size={5}
                                  imgSize={4}
                                  url={item.url}
                                />
                                <p className="line-clamp-1 max-w-[220px] cursor-pointer text-ellipsis">
                                  slugy.co/{item.slug}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="relative z-10 text-right">
                              {formatNumber(item.clicks)}
                            </TableCell>
                            <div
                              className="absolute inset-y-0 left-0 my-auto h-[85%] rounded-md bg-orange-200/40 dark:bg-orange-950/50"
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
                            No short links available
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="destination-links" className="mt-1">
            <ScrollArea className="h-72 w-full  ">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                      {sortedData.map((item) => {
                        const maxClicks = sortedData[0]?.clicks ?? 1;
                        const widthPercentage = (item.clicks / maxClicks) * 100;
                        return (
                          <TableRow
                            key={`dest-${item.url}`}
                            className="relative border-none"
                          >
                            <TableCell className="relative z-10 line-clamp-1">
                              <div className="flex items-center gap-x-2">
                                <UrlAvatar
                                  className="rounded-sm"
                                  size={5}
                                  imgSize={4}
                                  url={item.url}
                                />
                                <span className="line-clamp-1 max-w-[220px] text-ellipsis">
                                  {item.url
                                    .replace("https://", "")
                                    .replace("http://", "")
                                    .replace("www.", "")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="relative z-10 text-right">
                              {formatNumber(item.clicks)}
                            </TableCell>
                            <div
                              className="absolute inset-y-0 left-0 my-auto h-[85%] rounded-md bg-orange-200/40 dark:bg-orange-950/50"
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
                            No destination URLs available
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

export default UrlClicks;
