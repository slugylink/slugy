"use server";
import {
  type AnalyticsResponse,
  type AnalyticsMetric,
  type AnalyticsRequestProps,
} from "@/server/actions/analytics/analytics";
import { getAnalytics } from "@/server/actions/analytics/get-analytics";
import { cache } from "react";

// Default metrics (all)
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

// function serializeParams(params: Record<string, string>): string {
//   return JSON.stringify(
//     Object.entries(params)
//       .sort(([a], [b]) => a.localeCompare(b))
//       .reduce(
//         (acc, [k, v]) => {
//           acc[k] = v;
//           return acc;
//         },
//         {} as Record<string, string>,
//       ),
//   );
// }

export const getAnalyticsData = cache(
  async (
    workspaceslug: string,
    params: Record<string, string>,
    metrics?: AnalyticsMetric[],
  ): Promise<AnalyticsResponse> => {
    // const serializedParams = serializeParams(params);


    // Core analytics call (keep your existing field extraction):
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
      metrics: metrics ?? ALL_METRICS,
    });
  },
);

// Client-side function that calls the server action
export const fetchAnalyticsData = async (
  workspaceslug: string,
  params: Record<string, string>,
  metrics?: AnalyticsMetric[],
): Promise<AnalyticsResponse> => {
  return getAnalyticsData(workspaceslug, params, metrics);
};

// For chart data, we'll use the same analytics data and format it
export const fetchChartData = async (
  workspaceslug: string,
  params: Record<string, string>,
): Promise<{
  clicksOverTime: { time: Date; clicks: number }[];
  totalClicks: number;
}> => {
  const analyticsData = await getAnalyticsData(workspaceslug, params, [
    "clicksOverTime",
    "totalClicks",
  ]);
  return {
    clicksOverTime: analyticsData.clicksOverTime || [],
    totalClicks: analyticsData.totalClicks || 0,
  };
};

// For other data types, implement specific functions with selective metrics
export const fetchUrlClicksData = async (
  workspaceslug: string,
  params: Record<string, string>,
): Promise<Array<{ slug: string; url: string; clicks: number }>> => {
  const analyticsData = await getAnalyticsData(workspaceslug, params, [
    "links",
  ]);
  return (
    analyticsData.links?.map((link) => ({
      slug: link.slug,
      url: link.url,
      clicks: link.clicks || 0,
    })) || []
  );
};

export const fetchGeoData = async (
  workspaceslug: string,
  params: Record<string, string>,
  type: "countries" | "cities" | "continents",
): Promise<
  Array<{ country?: string; city?: string; continent?: string; clicks: number }>
> => {
  let metric: AnalyticsMetric;
  if (type === "countries") metric = "countries";
  else if (type === "cities") metric = "cities";
  else metric = "continents";
  const analyticsData = await getAnalyticsData(workspaceslug, params, [metric]);
  switch (type) {
    case "countries":
      return (
        analyticsData.countries?.map((country) => ({
          country: country.country,
          clicks: country.clicks || 0,
        })) || []
      );
    case "cities":
      return (
        analyticsData.cities?.map((city) => ({
          city: city.city,
          country: city.country,
          clicks: city.clicks || 0,
        })) || []
      );
    case "continents":
      return (
        analyticsData.continents?.map((continent) => ({
          continent: continent.continent,
          clicks: continent.clicks || 0,
        })) || []
      );
    default:
      return [];
  }
};

export const fetchDeviceData = async (
  workspaceslug: string,
  params: Record<string, string>,
  type: "devices" | "browsers" | "os",
): Promise<
  Array<{ device?: string; browser?: string; os?: string; clicks: number }>
> => {
  let metric: AnalyticsMetric;
  if (type === "devices") metric = "devices";
  else if (type === "browsers") metric = "browsers";
  else metric = "oses";
  const analyticsData = await getAnalyticsData(workspaceslug, params, [metric]);
  switch (type) {
    case "devices":
      return (
        analyticsData.devices?.map((device) => ({
          device: device.device,
          clicks: device.clicks || 0,
        })) || []
      );
    case "browsers":
      return (
        analyticsData.browsers?.map((browser) => ({
          browser: browser.browser,
          clicks: browser.clicks || 0,
        })) || []
      );
    case "os":
      return (
        analyticsData.oses?.map((os) => ({
          os: os.os,
          clicks: os.clicks || 0,
        })) || []
      );
    default:
      return [];
  }
};

export const fetchReferrerData = async (
  workspaceslug: string,
  params: Record<string, string>,
): Promise<Array<{ referrer: string; clicks: number }>> => {
  const analyticsData = await getAnalyticsData(workspaceslug, params, [
    "referrers",
  ]);
  return (
    analyticsData.referrers?.map((referrer) => ({
      referrer: referrer.referrer,
      clicks: referrer.clicks || 0,
    })) || []
  );
};
