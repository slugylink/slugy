"use server";
import {
  type AnalyticsResponse,
  type AnalyticsMetric,
  type AnalyticsRequestProps,
} from "@/server/actions/analytics/analytics";
import { getAnalytics } from "@/server/actions/analytics/get-analytics";
import { cache } from "react";

// -------------------- Defaults --------------------
const ALL_METRICS: AnalyticsMetric[] = [
  "totalClicks",
  "clicksOverTime",
  "links",
  "cities",
  "countries",
  "continents",
  "devices",
  "browsers",
  "oses",
  "referrers",
  "destinations",
];

// -------------------- Helpers --------------------
const safeClick = (n?: number): number => n ?? 0;

function mapMetric<T, R>(arr: T[] | undefined, mapper: (item: T) => R): R[] {
  return arr?.map(mapper) ?? [];
}

// -------------------- Core Server Action --------------------
export const getAnalyticsData = cache(
  async (
    workspaceslug: string,
    params: Record<string, string>,
    metrics: AnalyticsMetric[] = ALL_METRICS
  ): Promise<AnalyticsResponse> => {
    return getAnalytics({
      workspaceslug,
      timePeriod:
        (params.time_period as AnalyticsRequestProps["timePeriod"]) || "24h",
      slug_key: params.slug_key || null,
      country_key: params.country_key || null,
      city_key: params.city_key || null,
      continent_key: params.continent_key || null,
      browser_key: params.browser_key || null,
      os_key: params.os_key || null,
      referrer_key: params.referrer_key || null,
      device_key: params.device_key || null,
      destination_key: params.destination_key || null,
      metrics,
    });
  }
);

// -------------------- Client-side Wrappers --------------------
export const fetchAnalyticsData = async (
  workspaceslug: string,
  params: Record<string, string>,
  metrics?: AnalyticsMetric[]
): Promise<AnalyticsResponse> => {
  return getAnalyticsData(workspaceslug, params, metrics);
};

// -------------------- Chart Data --------------------
export const fetchChartData = async (
  workspaceslug: string,
  params: Record<string, string>
) => {
  const analyticsData = await getAnalyticsData(workspaceslug, params, [
    "clicksOverTime",
    "totalClicks",
  ]);
  return {
    clicksOverTime: analyticsData.clicksOverTime ?? [],
    totalClicks: analyticsData.totalClicks ?? 0,
  };
};

// -------------------- URL Clicks --------------------
export const fetchUrlClicksData = async (
  workspaceslug: string,
  params: Record<string, string>
) => {
  const { links } = await getAnalyticsData(workspaceslug, params, ["links"]);
  return mapMetric(links, (l) => ({
    slug: l.slug,
    url: l.url,
    clicks: safeClick(l.clicks),
  }));
};

// -------------------- Geo Data --------------------
export const fetchGeoData = async (
  workspaceslug: string,
  params: Record<string, string>,
  type: "countries" | "cities" | "continents"
) => {
  const data = await getAnalyticsData(workspaceslug, params, [type]);
  switch (type) {
    case "countries":
      return mapMetric(data.countries, (c) => ({
        country: c.country,
        clicks: safeClick(c.clicks),
      }));
    case "cities":
      return mapMetric(data.cities, (c) => ({
        city: c.city,
        country: c.country,
        clicks: safeClick(c.clicks),
      }));
    case "continents":
      return mapMetric(data.continents, (c) => ({
        continent: c.continent,
        clicks: safeClick(c.clicks),
      }));
  }
};

// -------------------- Device / Browser / OS Data --------------------
export const fetchDeviceData = async (
  workspaceslug: string,
  params: Record<string, string>,
  type: "devices" | "browsers" | "os"
) => {
  const metric: AnalyticsMetric =
    type === "os" ? "oses" : (type as AnalyticsMetric);
  const data = await getAnalyticsData(workspaceslug, params, [metric]);

  switch (type) {
    case "devices":
      return mapMetric(data.devices, (d) => ({
        device: d.device,
        clicks: safeClick(d.clicks),
      }));
    case "browsers":
      return mapMetric(data.browsers, (b) => ({
        browser: b.browser,
        clicks: safeClick(b.clicks),
      }));
    case "os":
      return mapMetric(data.oses, (o) => ({
        os: o.os,
        clicks: safeClick(o.clicks),
      }));
  }
};

// -------------------- Referrer Data --------------------
export const fetchReferrerData = async (
  workspaceslug: string,
  params: Record<string, string>
) => {
  const { referrers } = await getAnalyticsData(workspaceslug, params, [
    "referrers",
  ]);
  return mapMetric(referrers, (r) => ({
    referrer: r.referrer,
    clicks: safeClick(r.clicks),
  }));
};
