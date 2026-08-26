import type { AnalyticsData, TimePeriod } from "@/hooks/use-analytics";

type ChartPoint = { time: string; clicks: number };

function hoursAgo(hours: number): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function monthsAgo(months: number): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

const SERIES_24H: ChartPoint[] = Array.from({ length: 24 }, (_, i) => ({
  time: hoursAgo(23 - i),
  clicks: [
    2, 1, 0, 1, 3, 2, 4, 5, 7, 6, 8, 9, 7, 6, 8, 10, 9, 7, 5, 4, 3, 2, 2, 1,
  ][i]!,
}));

const SERIES_7D: ChartPoint[] = [
  { time: daysAgo(6), clicks: 18 },
  { time: daysAgo(5), clicks: 22 },
  { time: daysAgo(4), clicks: 15 },
  { time: daysAgo(3), clicks: 28 },
  { time: daysAgo(2), clicks: 24 },
  { time: daysAgo(1), clicks: 31 },
  { time: daysAgo(0), clicks: 27 },
];

const SERIES_30D: ChartPoint[] = Array.from({ length: 30 }, (_, i) => ({
  time: daysAgo(29 - i),
  clicks: 8 + ((i * 7) % 17) + (i % 5),
}));

const SERIES_3M: ChartPoint[] = [
  { time: monthsAgo(2), clicks: 142 },
  { time: monthsAgo(1), clicks: 186 },
  { time: monthsAgo(0), clicks: 168 },
];

const SERIES_12M: ChartPoint[] = Array.from({ length: 12 }, (_, i) => ({
  time: monthsAgo(11 - i),
  clicks: 90 + i * 12 + ((i * 5) % 20),
}));

const SERIES_ALL: ChartPoint[] = [
  { time: monthsAgo(23), clicks: 42 },
  { time: monthsAgo(18), clicks: 78 },
  { time: monthsAgo(12), clicks: 124 },
  { time: monthsAgo(6), clicks: 210 },
  { time: monthsAgo(3), clicks: 268 },
  { time: monthsAgo(0), clicks: 312 },
];

const TOTALS: Record<TimePeriod, number> = {
  "24h": SERIES_24H.reduce((s, p) => s + p.clicks, 0),
  "7d": SERIES_7D.reduce((s, p) => s + p.clicks, 0),
  "30d": SERIES_30D.reduce((s, p) => s + p.clicks, 0),
  "3m": SERIES_3M.reduce((s, p) => s + p.clicks, 0),
  "12m": SERIES_12M.reduce((s, p) => s + p.clicks, 0),
  all: SERIES_ALL.reduce((s, p) => s + p.clicks, 0),
};

const SERIES: Record<TimePeriod, ChartPoint[]> = {
  "24h": SERIES_24H,
  "7d": SERIES_7D,
  "30d": SERIES_30D,
  "3m": SERIES_3M,
  "12m": SERIES_12M,
  all: SERIES_ALL,
};

const DEMO_LINKS: AnalyticsData["links"] = [
  {
    slug: "launch",
    url: "https://example.com/launch",
    domain: "slugy.co",
    clicks: 48,
  },
  {
    slug: "waitlist",
    url: "https://example.com/waitlist",
    domain: "slugy.co",
    clicks: 36,
  },
  {
    slug: "demo",
    url: "https://example.com/demo",
    domain: "slugy.co",
    clicks: 29,
  },
  {
    slug: "newsletter",
    url: "https://example.com/newsletter",
    domain: "go.slugy.co",
    clicks: 21,
  },
  {
    slug: "pricing",
    url: "https://example.com/pricing",
    domain: "slugy.co",
    clicks: 14,
  },
];

const DEMO_DESTINATIONS: AnalyticsData["destinations"] = [
  { destination: "https://example.com/launch", clicks: 48 },
  { destination: "https://example.com/waitlist", clicks: 36 },
  { destination: "https://example.com/demo", clicks: 29 },
  { destination: "https://example.com/newsletter", clicks: 21 },
  { destination: "https://example.com/pricing", clicks: 14 },
];

const DEMO_COUNTRIES: AnalyticsData["countries"] = [
  { country: "United States", clicks: 62 },
  { country: "India", clicks: 34 },
  { country: "United Kingdom", clicks: 22 },
  { country: "Germany", clicks: 15 },
  { country: "Brazil", clicks: 11 },
];

const DEMO_CITIES: AnalyticsData["cities"] = [
  { city: "San Francisco", country: "United States", clicks: 24 },
  { city: "New York", country: "United States", clicks: 18 },
  { city: "Bengaluru", country: "India", clicks: 16 },
  { city: "London", country: "United Kingdom", clicks: 14 },
  { city: "Berlin", country: "Germany", clicks: 9 },
];

const DEMO_CONTINENTS: AnalyticsData["continents"] = [
  { continent: "North America", clicks: 68 },
  { continent: "Asia", clicks: 41 },
  { continent: "Europe", clicks: 37 },
  { continent: "South America", clicks: 12 },
  { continent: "Oceania", clicks: 6 },
];

const DEMO_DEVICES: AnalyticsData["devices"] = [
  { device: "Desktop", clicks: 94 },
  { device: "Mobile", clicks: 58 },
  { device: "Tablet", clicks: 12 },
];

const DEMO_BROWSERS: AnalyticsData["browsers"] = [
  { browser: "Chrome", clicks: 88 },
  { browser: "Safari", clicks: 41 },
  { browser: "Firefox", clicks: 18 },
  { browser: "Edge", clicks: 12 },
  { browser: "Other", clicks: 5 },
];

const DEMO_OSES: AnalyticsData["oses"] = [
  { os: "macOS", clicks: 52 },
  { os: "Windows", clicks: 47 },
  { os: "iOS", clicks: 34 },
  { os: "Android", clicks: 26 },
  { os: "Linux", clicks: 5 },
];

const DEMO_REFERRERS: AnalyticsData["referrers"] = [
  { referrer: "twitter.com", clicks: 41 },
  { referrer: "linkedin.com", clicks: 33 },
  { referrer: "google.com", clicks: 28 },
  { referrer: "Direct", clicks: 24 },
  { referrer: "producthunt.com", clicks: 18 },
];

export type AnalyticsEvent = "clicks" | "leads";

export function parseAnalyticsEvent(
  value: string | null | undefined,
): AnalyticsEvent {
  return value === "leads" ? "leads" : "clicks";
}

export function getLeadsDemoData(timePeriod: TimePeriod): {
  totalLeads: number;
  leadsOverTime: ChartPoint[];
  links: AnalyticsData["links"];
  destinations: AnalyticsData["destinations"];
  countries: AnalyticsData["countries"];
  cities: AnalyticsData["cities"];
  continents: AnalyticsData["continents"];
  devices: AnalyticsData["devices"];
  browsers: AnalyticsData["browsers"];
  oses: AnalyticsData["oses"];
  referrers: AnalyticsData["referrers"];
} {
  return {
    totalLeads: TOTALS[timePeriod],
    leadsOverTime: SERIES[timePeriod],
    links: DEMO_LINKS,
    destinations: DEMO_DESTINATIONS,
    countries: DEMO_COUNTRIES,
    cities: DEMO_CITIES,
    continents: DEMO_CONTINENTS,
    devices: DEMO_DEVICES,
    browsers: DEMO_BROWSERS,
    oses: DEMO_OSES,
    referrers: DEMO_REFERRERS,
  };
}
