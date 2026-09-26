export type AnalyticsEvent = "clicks" | "leads" | "sales";
export type AnalyticsView = "timeseries" | "funnel";

export interface DemoAnalyticsData {
  totalClicks: number;
  totalRevenue?: number;
  clicksOverTime: Array<{ time: string; clicks: number }>;
  revenueOverTime?: Array<{ time: string; revenue: number; sales: number }>;
  links: Array<{
    slug: string;
    url: string;
    domain: string;
    clicks: number;
  }>;
  cities: Array<{ city: string; country: string; clicks: number }>;
  countries: Array<{ country: string; clicks: number }>;
  continents: Array<{ continent: string; clicks: number }>;
  devices: Array<{ device: string; clicks: number }>;
  browsers: Array<{ browser: string; clicks: number }>;
  oses: Array<{ os: string; clicks: number }>;
  referrers: Array<{ referrer: string; clicks: number }>;
  destinations: Array<{ destination: string; clicks: number }>;
  utmSources: Array<{ source: string; clicks: number }>;
  utmMediums: Array<{ medium: string; clicks: number }>;
  utmCampaigns: Array<{ campaign: string; clicks: number }>;
  utmTerms: Array<{ term: string; clicks: number }>;
  utmContents: Array<{ content: string; clicks: number }>;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const times = Array.from({ length: 30 }, (_, index) =>
  new Date(Date.now() - (29 - index) * DAY_IN_MS).toISOString(),
);

const clicks = (values: readonly number[]) =>
  times.map((time, index) => ({
    time,
    clicks: values[index]!,
  }));

const total = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + value, 0);

const clickSeries = [
  21, 28, 32, 29, 35, 39, 42, 31, 27, 34, 38, 45, 41, 36, 30, 44, 49, 37, 35,
  40, 47, 52, 56, 48, 43, 25, 51, 30, 30, 30,
] as const;

const leadSeries = [
  1, 2, 2, 1, 3, 2, 3, 2, 1, 2, 3, 4, 3, 2, 2, 4, 4, 3, 2, 3, 4, 4, 5, 3, 3, 2,
  4, 4, 4, 4,
] as const;

const demoLinks = [
  {
    slug: "summer-sale",
    url: "https://shopify.com/summer-sale",
    domain: "shopify.com",
    clicks: 486,
  },
  {
    slug: "product-demo",
    url: "https://stripe.com/demo",
    domain: "stripe.com",
    clicks: 312,
  },
  {
    slug: "newsletter",
    url: "https://notion.so/newsletter",
    domain: "notion.so",
    clicks: 241,
  },
  {
    slug: "github-repo",
    url: "https://github.com/vercel/next.js",
    domain: "github.com",
    clicks: 198,
  },
  {
    slug: "design-resources",
    url: "https://www.figma.com/community",
    domain: "figma.com",
    clicks: 164,
  },
  {
    slug: "web-development",
    url: "https://www.udemy.com/course/web-development",
    domain: "udemy.com",
    clicks: 137,
  },
] as const;

const clickData = {
  totalClicks: total(clickSeries),

  clicksOverTime: clicks(clickSeries),

  links: demoLinks.map((link) => ({
    ...link,
  })),

  cities: [
    {
      city: "New York",
      country: "us",
      clicks: 298,
    },
    {
      city: "London",
      country: "gb",
      clicks: 187,
    },
    {
      city: "Bengaluru",
      country: "in",
      clicks: 154,
    },
    {
      city: "San Francisco",
      country: "us",
      clicks: 132,
    },
    {
      city: "Toronto",
      country: "ca",
      clicks: 118,
    },
    {
      city: "Singapore",
      country: "sg",
      clicks: 104,
    },
  ],

  countries: [
    {
      country: "us",
      clicks: 462,
    },
    {
      country: "gb",
      clicks: 224,
    },
    {
      country: "in",
      clicks: 186,
    },
    {
      country: "ca",
      clicks: 142,
    },
    {
      country: "de",
      clicks: 119,
    },
    {
      country: "sg",
      clicks: 98,
    },
  ],

  continents: [
    {
      continent: "North America",
      clicks: 521,
    },
    {
      continent: "Europe",
      clicks: 287,
    },
    {
      continent: "Asia",
      clicks: 244,
    },
    {
      continent: "South America",
      clicks: 86,
    },
    {
      continent: "Oceania",
      clicks: 54,
    },
  ],

  devices: [
    {
      device: "Mobile",
      clicks: 692,
    },
    {
      device: "Desktop",
      clicks: 419,
    },
    {
      device: "Tablet",
      clicks: 46,
    },
  ],

  browsers: [
    {
      browser: "Chrome",
      clicks: 703,
    },
    {
      browser: "Safari",
      clicks: 279,
    },
    {
      browser: "Firefox",
      clicks: 91,
    },
    {
      browser: "Edge",
      clicks: 63,
    },
  ],

  oses: [
    {
      os: "iOS",
      clicks: 402,
    },
    {
      os: "Windows",
      clicks: 318,
    },
    {
      os: "Android",
      clicks: 290,
    },
    {
      os: "macOS",
      clicks: 126,
    },
    {
      os: "Linux",
      clicks: 42,
    },
  ],

  referrers: [
    {
      referrer: "Instagram",
      clicks: 383,
    },
    {
      referrer: "Google",
      clicks: 306,
    },
    {
      referrer: "Direct",
      clicks: 251,
    },
    {
      referrer: "LinkedIn",
      clicks: 218,
    },
    {
      referrer: "Twitter",
      clicks: 164,
    },
    {
      referrer: "Reddit",
      clicks: 97,
    },
  ],

  destinations: demoLinks.map((link) => ({
    destination: link.url,
    clicks: link.clicks,
  })),

  utmSources: [
    {
      source: "instagram",
      clicks: 383,
    },
    {
      source: "google",
      clicks: 306,
    },
    {
      source: "linkedin",
      clicks: 218,
    },
    {
      source: "twitter",
      clicks: 164,
    },
    {
      source: "reddit",
      clicks: 97,
    },
  ],

  utmMediums: [
    {
      medium: "social",
      clicks: 427,
    },
    {
      medium: "cpc",
      clicks: 306,
    },
    {
      medium: "email",
      clicks: 218,
    },
    {
      medium: "referral",
      clicks: 164,
    },
    {
      medium: "organic",
      clicks: 142,
    },
  ],

  utmCampaigns: [
    {
      campaign: "summer-sale",
      clicks: 486,
    },
    {
      campaign: "product-launch",
      clicks: 312,
    },
    {
      campaign: "newsletter",
      clicks: 241,
    },
    {
      campaign: "github-promo",
      clicks: 198,
    },
    {
      campaign: "design-resources",
      clicks: 164,
    },
  ],

  utmTerms: [
    {
      term: "short links",
      clicks: 184,
    },
    {
      term: "link management",
      clicks: 122,
    },
    {
      term: "url shortener",
      clicks: 96,
    },
    {
      term: "link analytics",
      clicks: 81,
    },
  ],

  utmContents: [
    {
      content: "profile-bio",
      clicks: 383,
    },
    {
      content: "search-ad",
      clicks: 306,
    },
    {
      content: "email-cta",
      clicks: 218,
    },
    {
      content: "social-post",
      clicks: 164,
    },
    {
      content: "homepage-banner",
      clicks: 127,
    },
  ],
} satisfies DemoAnalyticsData;

export const DEMO_ANALYTICS_DATA: Record<AnalyticsEvent, DemoAnalyticsData> = {
  clicks: clickData,

  leads: {
    totalClicks: total(leadSeries),

    clicksOverTime: clicks(leadSeries),

    links: demoLinks.map((link, index) => ({
      ...link,
      clicks: [39, 28, 19, 16, 12, 9][index]!,
    })),

    cities: [
      {
        city: "New York",
        country: "us",
        clicks: 22,
      },
      {
        city: "London",
        country: "gb",
        clicks: 16,
      },
      {
        city: "Bengaluru",
        country: "in",
        clicks: 13,
      },
      {
        city: "San Francisco",
        country: "us",
        clicks: 11,
      },
      {
        city: "Toronto",
        country: "ca",
        clicks: 9,
      },
      {
        city: "Singapore",
        country: "sg",
        clicks: 7,
      },
    ],

    countries: [
      {
        country: "us",
        clicks: 37,
      },
      {
        country: "gb",
        clicks: 21,
      },
      {
        country: "in",
        clicks: 17,
      },
      {
        country: "ca",
        clicks: 12,
      },
      {
        country: "de",
        clicks: 9,
      },
      {
        country: "sg",
        clicks: 7,
      },
    ],

    continents: [
      {
        continent: "North America",
        clicks: 42,
      },
      {
        continent: "Europe",
        clicks: 25,
      },
      {
        continent: "Asia",
        clicks: 19,
      },
      {
        continent: "South America",
        clicks: 8,
      },
      {
        continent: "Oceania",
        clicks: 5,
      },
    ],

    devices: [
      {
        device: "Mobile",
        clicks: 54,
      },
      {
        device: "Desktop",
        clicks: 29,
      },
      {
        device: "Tablet",
        clicks: 3,
      },
    ],

    browsers: [
      {
        browser: "Chrome",
        clicks: 51,
      },
      {
        browser: "Safari",
        clicks: 24,
      },
      {
        browser: "Firefox",
        clicks: 7,
      },
      {
        browser: "Edge",
        clicks: 4,
      },
    ],

    oses: [
      {
        os: "iOS",
        clicks: 35,
      },
      {
        os: "Windows",
        clicks: 24,
      },
      {
        os: "Android",
        clicks: 22,
      },
      {
        os: "macOS",
        clicks: 11,
      },
      {
        os: "Linux",
        clicks: 3,
      },
    ],

    referrers: [
      {
        referrer: "Instagram",
        clicks: 31,
      },
      {
        referrer: "Google",
        clicks: 27,
      },
      {
        referrer: "Direct",
        clicks: 18,
      },
      {
        referrer: "LinkedIn",
        clicks: 15,
      },
      {
        referrer: "Twitter",
        clicks: 11,
      },
      {
        referrer: "Reddit",
        clicks: 7,
      },
    ],

    destinations: demoLinks.map((link, index) => ({
      destination: link.url,
      clicks: [39, 28, 19, 16, 12, 9][index]!,
    })),

    utmSources: [
      {
        source: "instagram",
        clicks: 31,
      },
      {
        source: "google",
        clicks: 27,
      },
      {
        source: "linkedin",
        clicks: 15,
      },
      {
        source: "twitter",
        clicks: 11,
      },
      {
        source: "reddit",
        clicks: 7,
      },
    ],

    utmMediums: [
      {
        medium: "social",
        clicks: 36,
      },
      {
        medium: "cpc",
        clicks: 27,
      },
      {
        medium: "email",
        clicks: 18,
      },
      {
        medium: "referral",
        clicks: 13,
      },
      {
        medium: "organic",
        clicks: 9,
      },
    ],

    utmCampaigns: [
      {
        campaign: "summer-sale",
        clicks: 39,
      },
      {
        campaign: "product-launch",
        clicks: 28,
      },
      {
        campaign: "newsletter",
        clicks: 19,
      },
      {
        campaign: "github-promo",
        clicks: 16,
      },
      {
        campaign: "design-resources",
        clicks: 12,
      },
    ],

    utmTerms: [
      {
        term: "short links",
        clicks: 14,
      },
      {
        term: "link management",
        clicks: 11,
      },
      {
        term: "url shortener",
        clicks: 9,
      },
      {
        term: "link analytics",
        clicks: 7,
      },
    ],

    utmContents: [
      {
        content: "profile-bio",
        clicks: 31,
      },
      {
        content: "search-ad",
        clicks: 27,
      },
      {
        content: "email-cta",
        clicks: 18,
      },
      {
        content: "social-post",
        clicks: 11,
      },
      {
        content: "homepage-banner",
        clicks: 8,
      },
    ],
  },

  sales: {
    totalClicks: 18,
    totalRevenue: 1367,

    clicksOverTime: [
      { time: times[4]!, clicks: 1 },
      { time: times[11]!, clicks: 2 },
      { time: times[18]!, clicks: 3 },
      { time: times[24]!, clicks: 5 },
      { time: times[28]!, clicks: 7 },
    ],

    revenueOverTime: [
      { time: times[4]!, revenue: 49, sales: 1 },
      { time: times[11]!, revenue: 129, sales: 2 },
      { time: times[18]!, revenue: 241, sales: 3 },
      { time: times[24]!, revenue: 399, sales: 5 },
      { time: times[28]!, revenue: 549, sales: 7 },
    ],

    links: demoLinks.slice(0, 3).map((link, index) => ({
      ...link,
      clicks: [8, 6, 4][index]!,
    })),

    cities: [
      { city: "New York", country: "us", clicks: 7 },
      { city: "London", country: "gb", clicks: 5 },
      { city: "Toronto", country: "ca", clicks: 4 },
      { city: "Singapore", country: "sg", clicks: 2 },
    ],

    countries: [
      { country: "us", clicks: 8 },
      { country: "gb", clicks: 5 },
      { country: "ca", clicks: 3 },
      { country: "sg", clicks: 2 },
    ],

    continents: [
      { continent: "North America", clicks: 11 },
      { continent: "Europe", clicks: 5 },
      { continent: "Asia", clicks: 2 },
    ],

    devices: [
      { device: "Desktop", clicks: 11 },
      { device: "Mobile", clicks: 6 },
      { device: "Tablet", clicks: 1 },
    ],

    browsers: [
      { browser: "Chrome", clicks: 10 },
      { browser: "Safari", clicks: 5 },
      { browser: "Edge", clicks: 3 },
    ],

    oses: [
      { os: "Windows", clicks: 7 },
      { os: "macOS", clicks: 6 },
      { os: "iOS", clicks: 5 },
    ],

    referrers: [
      { referrer: "Google", clicks: 8 },
      { referrer: "Direct", clicks: 6 },
      { referrer: "LinkedIn", clicks: 4 },
    ],

    destinations: demoLinks.slice(0, 3).map((link, index) => ({
      destination: link.url,
      clicks: [8, 6, 4][index]!,
    })),

    utmSources: [
      { source: "google", clicks: 8 },
      { source: "linkedin", clicks: 4 },
      { source: "newsletter", clicks: 6 },
    ],

    utmMediums: [
      { medium: "cpc", clicks: 8 },
      { medium: "email", clicks: 6 },
      { medium: "referral", clicks: 4 },
    ],

    utmCampaigns: [
      { campaign: "summer-sale", clicks: 9 },
      { campaign: "product-launch", clicks: 6 },
      { campaign: "newsletter", clicks: 3 },
    ],

    utmTerms: [
      { term: "short links", clicks: 5 },
      { term: "link management", clicks: 4 },
    ],

    utmContents: [
      { content: "search-ad", clicks: 8 },
      { content: "email-cta", clicks: 6 },
      { content: "profile-bio", clicks: 4 },
    ],
  },
};

export function parseAnalyticsEvent(
  value: string | null | undefined,
): AnalyticsEvent {
  if (value === "leads") return "leads";
  if (value === "sales") return "sales";
  return "clicks";
}

export function parseAnalyticsView(
  value: string | null | undefined,
): AnalyticsView {
  return value === "funnel" ? "funnel" : "timeseries";
}
