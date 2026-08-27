export type TimePeriod = "24h" | "7d" | "30d" | "3m" | "12m" | "all";

export type AnalyticsMetric =
  | "totalClicks"
  | "clicksOverTime"
  | "links"
  | "cities"
  | "countries"
  | "continents"
  | "devices"
  | "browsers"
  | "oses"
  | "referrers"
  | "destinations";

export interface TinybirdAnalyticsRow {
  link_id: string;
  day: string;
  clicks: number;
  "meta.slug": string;
  "meta.url": string;
  domain: string;
  country: string;
  city: string;
  continent: string;
  device: string;
  browser: string;
  os: string;
  referer: string;
}

function getTimeKey(day: string, timePeriod: TimePeriod): string {
  const dayDate = new Date(day);

  if (timePeriod === "24h") {
    const hourDate = new Date(dayDate);
    hourDate.setMinutes(0, 0, 0);
    return hourDate.toISOString();
  }

  if (timePeriod === "7d" || timePeriod === "30d") {
    return day.includes("T") ? dayDate.toISOString().split("T")[0]! : day;
  }

  const yearMonth = day.includes("T")
    ? dayDate.toISOString().substring(0, 7)
    : day.substring(0, 7);
  return `${yearMonth}-01`;
}

export function transformTinybirdAnalytics(
  tinybirdData: TinybirdAnalyticsRow[],
  requestedMetrics: AnalyticsMetric[],
  timePeriod: TimePeriod = "7d",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const metricSet = new Set(requestedMetrics);

  const timeMap = metricSet.has("clicksOverTime")
    ? new Map<string, number>()
    : null;
  const linksMap = metricSet.has("links")
    ? new Map<
        string,
        { slug: string; url: string; domain: string; clicks: number }
      >()
    : null;
  const citiesMap = metricSet.has("cities")
    ? new Map<string, { city: string; country: string; clicks: number }>()
    : null;
  const countriesMap = metricSet.has("countries")
    ? new Map<string, { country: string; clicks: number }>()
    : null;
  const continentsMap = metricSet.has("continents")
    ? new Map<string, { continent: string; clicks: number }>()
    : null;
  const devicesMap = metricSet.has("devices")
    ? new Map<string, { device: string; clicks: number }>()
    : null;
  const browsersMap = metricSet.has("browsers")
    ? new Map<string, { browser: string; clicks: number }>()
    : null;
  const osesMap = metricSet.has("oses")
    ? new Map<string, { os: string; clicks: number }>()
    : null;
  const referrersMap = metricSet.has("referrers")
    ? new Map<string, { referrer: string; clicks: number }>()
    : null;
  const destinationsMap = metricSet.has("destinations")
    ? new Map<string, { destination: string; clicks: number }>()
    : null;

  let totalClicks = 0;

  for (const item of tinybirdData) {
    const clicks = item.clicks;
    if (metricSet.has("totalClicks")) totalClicks += clicks;

    if (timeMap) {
      const timeKey = getTimeKey(item.day, timePeriod);
      timeMap.set(timeKey, (timeMap.get(timeKey) || 0) + clicks);
    }

    if (linksMap) {
      const key = `${item["meta.slug"]}-${item["meta.url"]}-${item.domain || "slugy.co"}`;
      const existing = linksMap.get(key);
      if (existing) existing.clicks += clicks;
      else {
        linksMap.set(key, {
          slug: item["meta.slug"],
          url: item["meta.url"],
          domain: item.domain || "slugy.co",
          clicks,
        });
      }
    }

    if (citiesMap && item.city) {
      const key = `${item.city}-${item.country}`;
      const existing = citiesMap.get(key);
      if (existing) existing.clicks += clicks;
      else {
        citiesMap.set(key, {
          city: item.city,
          country: item.country || "unknown",
          clicks,
        });
      }
    }

    if (countriesMap && item.country) {
      const existing = countriesMap.get(item.country);
      if (existing) existing.clicks += clicks;
      else countriesMap.set(item.country, { country: item.country, clicks });
    }

    if (continentsMap && item.continent) {
      const existing = continentsMap.get(item.continent);
      if (existing) existing.clicks += clicks;
      else {
        continentsMap.set(item.continent, {
          continent: item.continent,
          clicks,
        });
      }
    }

    if (devicesMap && item.device) {
      const existing = devicesMap.get(item.device);
      if (existing) existing.clicks += clicks;
      else devicesMap.set(item.device, { device: item.device, clicks });
    }

    if (browsersMap && item.browser) {
      const existing = browsersMap.get(item.browser);
      if (existing) existing.clicks += clicks;
      else browsersMap.set(item.browser, { browser: item.browser, clicks });
    }

    if (osesMap && item.os && item.os !== "unknown") {
      const existing = osesMap.get(item.os);
      if (existing) existing.clicks += clicks;
      else osesMap.set(item.os, { os: item.os, clicks });
    }

    if (referrersMap && item.referer) {
      const existing = referrersMap.get(item.referer);
      if (existing) existing.clicks += clicks;
      else referrersMap.set(item.referer, { referrer: item.referer, clicks });
    }

    if (destinationsMap && item["meta.url"]) {
      const existing = destinationsMap.get(item["meta.url"]);
      if (existing) existing.clicks += clicks;
      else {
        destinationsMap.set(item["meta.url"], {
          destination: item["meta.url"],
          clicks,
        });
      }
    }
  }

  if (metricSet.has("totalClicks")) {
    result.totalClicks = totalClicks;
  }

  if (timeMap) {
    result.clicksOverTime = Array.from(timeMap.entries())
      .map(([time, clicks]) => ({ time: new Date(time), clicks }))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }

  if (linksMap) {
    result.links = Array.from(linksMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }
  if (citiesMap) {
    result.cities = Array.from(citiesMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }
  if (countriesMap) {
    result.countries = Array.from(countriesMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }
  if (continentsMap) {
    result.continents = Array.from(continentsMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }
  if (devicesMap) {
    result.devices = Array.from(devicesMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }
  if (browsersMap) {
    result.browsers = Array.from(browsersMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }
  if (osesMap) {
    result.oses = Array.from(osesMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }
  if (referrersMap) {
    result.referrers = Array.from(referrersMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }
  if (destinationsMap) {
    result.destinations = Array.from(destinationsMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }

  return result;
}
