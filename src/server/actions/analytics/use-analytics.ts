"use server";
import { type AnalyticsResponse } from "@/server/actions/analytics/analytics";
import { getAnalytics } from "@/server/actions/analytics/get-analytics";
import { cache } from "react";

// Server action for fetching analytics data
export const getAnalyticsData = cache(
  async (
    workspaceslug: string,
    params: Record<string, string>,
  ): Promise<AnalyticsResponse> => {
    return getAnalytics({
      workspaceslug,
      timePeriod: (params.time_period as "24h" | "7d" | "30d" | "3m" | "12m" | "all") || "24h",
      slug_key: params.slug_key || null,
      country_key: params.country_key || null,
      city_key: params.city_key || null,
      continent_key: params.continent_key || null,
      browser_key: params.browser_key || null,
      os_key: params.os_key || null,
      referrer_key: params.referrer_key || null,
    });
  },
);

// Client-side function that calls the server action
export const fetchAnalyticsData = async (
  workspaceslug: string,
  params: Record<string, string>,
): Promise<AnalyticsResponse> => {
  return getAnalyticsData(workspaceslug, params);
};

// For chart data, we'll use the same analytics data and format it
export const fetchChartData = async (
  workspaceslug: string,
  params: Record<string, string>,
): Promise<{
  clicksOverTime: {
    time: Date;
    clicks: number;
  }[];
  totalClicks: number;
}> => {
  const analyticsData = await getAnalyticsData(workspaceslug, params);
  
  // Format the data for the chart
  const clicksOverTime = analyticsData.clicksOverTime || [];
  const totalClicks = analyticsData.totalClicks || 0;
  
  return {
    clicksOverTime,
    totalClicks,
  };
};

// For other data types, we'll need to implement specific functions
// For now, let's create placeholder functions that return empty arrays
export const fetchUrlClicksData = async (
  workspaceslug: string,
  params: Record<string, string>,
): Promise<Array<{ slug: string; url: string; clicks: number }>> => {
  const analyticsData = await getAnalyticsData(workspaceslug, params);
  
  // Extract URL clicks data from the analytics response
  return analyticsData.links?.map(link => ({
    slug: link.slug,
    url: link.url,
    clicks: link.clicks || 0,
  })) || [];
};

export const fetchGeoData = async (
  workspaceslug: string,
  params: Record<string, string>,
  type: "countries" | "cities" | "continents",
): Promise<Array<{ country?: string; city?: string; continent?: string; clicks: number }>> => {
  const analyticsData = await getAnalyticsData(workspaceslug, params);
  
  // Extract geo data based on type
  switch (type) {
    case "countries":
      return analyticsData.countries?.map(country => ({
        country: country.country,
        clicks: country.clicks || 0,
      })) || [];
    case "cities":
      return analyticsData.cities?.map(city => ({
        city: city.city,
        country: city.country,
        clicks: city.clicks || 0,
      })) || [];
    case "continents":
      return analyticsData.continents?.map(continent => ({
        continent: continent.continent,
        clicks: continent.clicks || 0,
      })) || [];
    default:
      return [];
  }
};

export const fetchDeviceData = async (
  workspaceslug: string,
  params: Record<string, string>,
  type: "devices" | "browsers" | "os",
): Promise<Array<{ device?: string; browser?: string; os?: string; clicks: number }>> => {
  const analyticsData = await getAnalyticsData(workspaceslug, params);
  
  // Extract device data based on type
  switch (type) {
    case "devices":
      return analyticsData.devices?.map(device => ({
        device: device.device,
        clicks: device.clicks || 0,
      })) || [];
    case "browsers":
      return analyticsData.browsers?.map(browser => ({
        browser: browser.browser,
        clicks: browser.clicks || 0,
      })) || [];
    case "os":
      return analyticsData.oses?.map(os => ({
        os: os.os,
        clicks: os.clicks || 0,
      })) || [];
    default:
      return [];
  }
};

export const fetchReferrerData = async (
  workspaceslug: string,
  params: Record<string, string>,
): Promise<Array<{ referrer: string; clicks: number }>> => {
  const analyticsData = await getAnalyticsData(workspaceslug, params);
  
  // Extract referrer data from the analytics response
  return analyticsData.referrers?.map(referrer => ({
    referrer: referrer.referrer,
    clicks: referrer.clicks || 0,
  })) || [];
};
