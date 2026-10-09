export type BillingPeriod = "monthly" | "yearly";
export type PlanType = "free" | "basic" | "pro" | "growth" | "premium";
export type PricingFeatureValue = string | boolean | number;

export interface Plan {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceId: string;
  yearlyPriceId: string;
  isRecommended: boolean;
  buttonLabel: string;
  isReady: boolean;
  yearlyDiscount: number;
  planType: PlanType;
  currency: string;
  interval: "month" | "year";
  maxWorkspaces: number;
  maxLinksPerWorkspace: number;
  maxClicksPerWorkspace: number;
  maxUsers: number;
  maxCustomDomains: number;
  maxBioLinks: number;
  maxLinkTags: number;
  maxUTM: number;
  maxGalleries: number;
  linkExp: boolean;
  linkPassword: boolean;
  linkGeoTargeting: boolean;
  analyticsRetention: string;
  customizeLinkPreview: boolean;
  features: string[];
}

export interface PricingComparisonRow {
  feature: string;
  free: PricingFeatureValue;
  pro: PricingFeatureValue;
  growth: PricingFeatureValue;
  premium: PricingFeatureValue;
}

export const PRICING_COPY = {
  promoCode: "GETPRO",
  promoPrefix: "Use code",
  promoSuffix: "to lock Pro at $5/month — forever.",
  promoAmount: 3,
  promoPrice: 5,
  promoDuration: "forever",
  promoMaxRedemptions: 25,
  yearlySavings: "2 Months Free",
  loginUrl: "https://app.slugy.co/login",
} as const;

export const PRICING_CURRENCY_FORMAT = {
  style: "currency" as const,
  currency: "USD",
  currencyDisplay: "narrowSymbol" as const,
  maximumFractionDigits: 0,
};

export function getYearlyDiscountPercent(
  monthlyPrice: number,
  yearlyPrice: number,
): number {
  const billedMonthly = monthlyPrice * 12;
  if (billedMonthly <= 0) return 0;
  return Number(
    (((billedMonthly - yearlyPrice) / billedMonthly) * 100).toFixed(2),
  );
}

export function getPlanPrice(plan: Plan, billing: BillingPeriod): number {
  if (plan.planType === "free" || plan.planType === "basic")
    return plan.monthlyPrice;
  return billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
}

export function getPlanPromoPrice(
  plan: Plan,
  billing: BillingPeriod,
): number | null {
  if (plan.planType !== "pro" || billing !== "monthly") return null;
  return Math.max(0, getPlanPrice(plan, billing) - PRICING_COPY.promoAmount);
}

export function getPlanPriceSubtitle(
  plan: Plan,
  billing: BillingPeriod,
): string {
  if (plan.planType === "free" || plan.planType === "basic") return "Forever";
  return billing === "yearly" ? "/year" : "/month";
}

/** Analytics event access per tier: free → clicks, pro → + leads, growth → + sales. */
export function getPlanAnalyticsTier(planType: PlanType): string {
  if (planType === "growth" || planType === "premium")
    return "Clicks + Leads + Sales";
  if (planType === "pro") return "Clicks + Leads";
  return "Clicks";
}

export function planHasLeadTracking(planType: PlanType): boolean {
  return planType === "pro" || planType === "growth" || planType === "premium";
}

export function planHasSalesAnalytics(planType: PlanType): boolean {
  return planType === "growth" || planType === "premium";
}

/** Plans flagged not-ready render disabled until launched. */
export function isPlanComingSoon(plan: Plan): boolean {
  return !plan.isReady;
}

export function getPlanCtaLabel(plan: Plan): string {
  return plan.buttonLabel;
}

function formatClicks(clicks: number): string {
  if (clicks < 1000) return `${clicks} clicks`;
  const value = clicks / 1000;
  const formatted = Number.isInteger(value)
    ? value.toFixed(0)
    : value.toFixed(1);
  return `${formatted}k clicks`;
}

// Pricing Values:
const PRO_MONTHLY_PRICE = 8;
const PRO_YEARLY_PRICE = 80;
const GROWTH_MONTHLY_PRICE = 29;
const GROWTH_YEARLY_PRICE = 290;
const PREMIUM_MONTHLY_PRICE = 199;
const PREMIUM_YEARLY_PRICE = 1990;

export const FREE_PLAN: Plan = {
  name: "Free",
  description: "Perfect for trying Slugy. Upgrade when you grow.",
  monthlyPrice: 0,
  yearlyPrice: 0,
  monthlyPriceId: "",
  yearlyPriceId: "",
  isRecommended: false,
  buttonLabel: "Get Started",
  isReady: true,
  yearlyDiscount: 0,
  planType: "free",
  currency: "USD",
  interval: "month",
  maxWorkspaces: 1,
  maxLinksPerWorkspace: 10,
  maxClicksPerWorkspace: 1000,
  maxUsers: 1,
  maxCustomDomains: 1,
  maxBioLinks: 5,
  maxLinkTags: 5,
  maxUTM: 5,
  maxGalleries: 1,
  linkExp: false,
  linkPassword: false,
  linkGeoTargeting: false,
  analyticsRetention: "30 days",
  customizeLinkPreview: false,
  features: [
    "1 workspace",
    "10 new links/month",
    "1k tracked clicks/month",
    "Basic analytics",
    "Basic QR codes",
    "5 links/bio links",
    "1 user",
    "1 custom domain",
    "5 link tags",
    "5 UTM templates",
    "Community support",
  ],
};

export const BASIC_PLAN: Plan = {
  name: "Basic",
  description: "Great for genuine users who need essential link tools.",
  monthlyPrice: 1,
  yearlyPrice: 1,
  monthlyPriceId: process.env.NEXT_PUBLIC_BASIC_PRICE_ID || "",
  yearlyPriceId: process.env.NEXT_PUBLIC_BASIC_PRICE_ID || "",
  isRecommended: false,
  buttonLabel: "Get Basic",
  isReady: true,
  yearlyDiscount: 0,
  planType: "basic",
  currency: "USD",
  interval: "month",
  maxWorkspaces: 2,
  maxLinksPerWorkspace: 20,
  maxClicksPerWorkspace: 1000,
  maxUsers: 1,
  maxCustomDomains: 2,
  maxBioLinks: 5,
  maxLinkTags: 5,
  maxUTM: 5,
  maxGalleries: 1,
  linkExp: false,
  linkPassword: false,
  linkGeoTargeting: false,
  analyticsRetention: "30 days",
  customizeLinkPreview: false,
  features: [
    "2 workspaces",
    "20 links/workspace",
    "1k tracked clicks/month",
    "Basic analytics",
    "Basic QR codes",
    "5 links/bio links",
    "2 custom domains",
    "1 user",
    "Community support",
    "5 link tags",
    "5 UTM templates",
  ],
};

export const PRO_PLAN: Plan = {
  name: "Pro",
  description: "Perfect for individuals and small teams.",
  monthlyPrice: PRO_MONTHLY_PRICE,
  yearlyPrice: PRO_YEARLY_PRICE,
  monthlyPriceId:
    process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID ||
    process.env.NEXT_PUBLIC_PRO_MONTHLY_PRODUCT_ID ||
    "",
  yearlyPriceId:
    process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID ||
    process.env.NEXT_PUBLIC_PRO_YEARLY_PRODUCT_ID ||
    "",
  isRecommended: false,
  buttonLabel: "Get Pro",
  isReady: true,
  yearlyDiscount: getYearlyDiscountPercent(PRO_MONTHLY_PRICE, PRO_YEARLY_PRICE),
  planType: "pro",
  currency: "USD",
  interval: "month",
  maxWorkspaces: 3,
  maxLinksPerWorkspace: 250,
  maxClicksPerWorkspace: 10000,
  maxUsers: 2,
  maxCustomDomains: 3,
  maxBioLinks: 10,
  maxLinkTags: 10,
  maxUTM: 10,
  maxGalleries: 2,
  linkExp: true,
  linkPassword: true,
  linkGeoTargeting: true,
  analyticsRetention: "12 months",
  customizeLinkPreview: true,
  features: [
    "3 workspaces",
    "250 new links/month",
    "10k tracked clicks/month",
    "Click + lead analytics",
    "Lead conversion tracking",
    "Custom link preview",
    "Link expiration",
    "Password protection",
    "Geo targeting",
    "10 links/bio links",
    "Up to 2 team members",
    "10 link tags",
    "12 months analytics retention",
    "Priority email support",
    "3 custom domains",
    "10 UTM templates",
  ],
};

export const GROWTH_PLAN: Plan = {
  name: "Growth",
  description: "For teams and agencies running links at scale.",
  monthlyPrice: GROWTH_MONTHLY_PRICE,
  yearlyPrice: GROWTH_YEARLY_PRICE,
  monthlyPriceId: process.env.NEXT_PUBLIC_GROWTH_MONTHLY_PRICE_ID || "",
  yearlyPriceId: process.env.NEXT_PUBLIC_GROWTH_YEARLY_PRICE_ID || "",
  isRecommended: true,
  buttonLabel: "Get Growth",
  isReady: true,
  yearlyDiscount: getYearlyDiscountPercent(
    GROWTH_MONTHLY_PRICE,
    GROWTH_YEARLY_PRICE,
  ),
  planType: "growth",
  currency: "USD",
  interval: "month",
  maxWorkspaces: 10,
  maxLinksPerWorkspace: 1500,
  maxClicksPerWorkspace: 50000,
  maxUsers: 5,
  maxCustomDomains: 10,
  maxBioLinks: 30,
  maxLinkTags: 30,
  maxUTM: 30,
  maxGalleries: 5,
  linkExp: true,
  linkPassword: true,
  linkGeoTargeting: true,
  analyticsRetention: "All time",
  customizeLinkPreview: true,
  features: [
    "10 workspaces",
    "1500 new links/month",
    "50k tracked clicks/month",
    "Click + lead + sales analytics",
    "Sales analytics with revenue attribution",
    "Custom link preview",
    "Link expiration",
    "Password protection",
    "Geo targeting",
    "30 links/bio links",
    "Up to 5 team members",
    "30 link tags",
    "All-time analytics retention",
    "Priority support",
    "10 custom domains",
    "30 UTM templates",
    "Bulk link creation",
  ],
};

export const PREMIUM_PLAN: Plan = {
  name: "Premium",
  description: "For larger teams and agencies managing high-volume campaigns.",
  monthlyPrice: PREMIUM_MONTHLY_PRICE,
  yearlyPrice: PREMIUM_YEARLY_PRICE,
  monthlyPriceId: process.env.NEXT_PUBLIC_PREMIUM_MONTHLY_PRICE_ID || "",
  yearlyPriceId: process.env.NEXT_PUBLIC_PREMIUM_YEARLY_PRICE_ID || "",
  isRecommended: false,
  buttonLabel: "Get Premium",
  isReady: true,
  yearlyDiscount: getYearlyDiscountPercent(
    PREMIUM_MONTHLY_PRICE,
    PREMIUM_YEARLY_PRICE,
  ),
  planType: "premium",
  currency: "USD",
  interval: "month",
  maxWorkspaces: 25,
  maxLinksPerWorkspace: 5000,
  maxClicksPerWorkspace: 250000,
  maxUsers: 15,
  maxCustomDomains: 30,
  maxBioLinks: 100,
  maxLinkTags: 100,
  maxUTM: 100,
  maxGalleries: 15,
  linkExp: true,
  linkPassword: true,
  linkGeoTargeting: true,
  analyticsRetention: "All time",
  customizeLinkPreview: true,
  features: [
    "25 workspaces",
    "5000 new links/month",
    "250k tracked clicks/month",
    "Click + lead + sales analytics",
    "Sales analytics with revenue attribution",
    "Custom link preview",
    "Link expiration",
    "Password protection",
    "Geo targeting",
    "100 links/bio links",
    "Up to 15 team members",
    "100 link tags",
    "All-time analytics retention",
    "Priority support",
    "30 custom domains",
    "100 UTM templates",
    "Bulk link creation",
  ],
};

export const plans: Plan[] = [FREE_PLAN, PRO_PLAN, GROWTH_PLAN, PREMIUM_PLAN];

export const PRICING_COMPARISON_FEATURES: PricingComparisonRow[] = [
  {
    feature: "Workspaces",
    free: FREE_PLAN.maxWorkspaces,
    pro: PRO_PLAN.maxWorkspaces,
    growth: GROWTH_PLAN.maxWorkspaces,
    premium: PREMIUM_PLAN.maxWorkspaces,
  },
  {
    feature: "Links",
    free: `${FREE_PLAN.maxLinksPerWorkspace} / workspace`,
    pro: `${PRO_PLAN.maxLinksPerWorkspace} / workspace`,
    growth: `${GROWTH_PLAN.maxLinksPerWorkspace} / workspace`,
    premium: `${PREMIUM_PLAN.maxLinksPerWorkspace} / workspace`,
  },
  {
    feature: "Analytics",
    free: formatClicks(FREE_PLAN.maxClicksPerWorkspace),
    pro: formatClicks(PRO_PLAN.maxClicksPerWorkspace),
    growth: formatClicks(GROWTH_PLAN.maxClicksPerWorkspace),
    premium: formatClicks(PREMIUM_PLAN.maxClicksPerWorkspace),
  },
  {
    feature: "Analytics events",
    free: getPlanAnalyticsTier("free"),
    pro: getPlanAnalyticsTier("pro"),
    growth: getPlanAnalyticsTier("growth"),
    premium: getPlanAnalyticsTier("premium"),
  },
  {
    feature: "Lead conversion tracking",
    free: false,
    pro: true,
    growth: true,
    premium: true,
  },
  {
    feature: "Sales analytics",
    free: false,
    pro: false,
    growth: true,
    premium: true,
  },
  {
    feature: "Analytics Retention",
    free: FREE_PLAN.analyticsRetention,
    pro: PRO_PLAN.analyticsRetention,
    growth: GROWTH_PLAN.analyticsRetention,
    premium: PREMIUM_PLAN.analyticsRetention,
  },
  {
    feature: "Advanced Analytics",
    free: false,
    pro: true,
    growth: true,
    premium: true,
  },
  {
    feature: "Bio Links",
    free: FREE_PLAN.maxBioLinks,
    pro: PRO_PLAN.maxBioLinks,
    growth: GROWTH_PLAN.maxBioLinks,
    premium: PREMIUM_PLAN.maxBioLinks,
  },
  {
    feature: "Link Tags",
    free: FREE_PLAN.maxLinkTags,
    pro: PRO_PLAN.maxLinkTags,
    growth: GROWTH_PLAN.maxLinkTags,
    premium: PREMIUM_PLAN.maxLinkTags,
  },
  {
    feature: "Custom Domains",
    free: FREE_PLAN.maxCustomDomains,
    pro: PRO_PLAN.maxCustomDomains,
    growth: GROWTH_PLAN.maxCustomDomains,
    premium: PREMIUM_PLAN.maxCustomDomains,
  },
  {
    feature: "Users",
    free: FREE_PLAN.maxUsers,
    pro: PRO_PLAN.maxUsers,
    growth: GROWTH_PLAN.maxUsers,
    premium: PREMIUM_PLAN.maxUsers,
  },
  {
    feature: "UTM Templates",
    free: FREE_PLAN.maxUTM,
    pro: PRO_PLAN.maxUTM,
    growth: GROWTH_PLAN.maxUTM,
    premium: PREMIUM_PLAN.maxUTM,
  },
  {
    feature: "Custom Link Preview",
    free: FREE_PLAN.customizeLinkPreview,
    pro: PRO_PLAN.customizeLinkPreview,
    growth: GROWTH_PLAN.customizeLinkPreview,
    premium: PREMIUM_PLAN.customizeLinkPreview,
  },
  {
    feature: "Link Expiration",
    free: FREE_PLAN.linkExp,
    pro: PRO_PLAN.linkExp,
    growth: GROWTH_PLAN.linkExp,
    premium: PREMIUM_PLAN.linkExp,
  },
  {
    feature: "Password Protection",
    free: FREE_PLAN.linkPassword,
    pro: PRO_PLAN.linkPassword,
    growth: GROWTH_PLAN.linkPassword,
    premium: PREMIUM_PLAN.linkPassword,
  },
  {
    feature: "Geo Targeting",
    free: FREE_PLAN.linkGeoTargeting,
    pro: PRO_PLAN.linkGeoTargeting,
    growth: GROWTH_PLAN.linkGeoTargeting,
    premium: PREMIUM_PLAN.linkGeoTargeting,
  },
];

export function toPlanSeed(plan: Plan) {
  return {
    name: plan.name,
    description: plan.description,
    monthlyPrice: plan.monthlyPrice,
    yearlyPrice: plan.yearlyPrice,
    monthlyPriceId: plan.monthlyPriceId,
    yearlyPriceId: plan.yearlyPriceId,
    yearlyDiscount: plan.yearlyDiscount,
    planType: plan.planType,
    currency: plan.currency,
    interval: plan.interval,
    buttonLabel: plan.buttonLabel,
    isReady: plan.isReady,
    isRecommended: plan.isRecommended,
    features: plan.features,
    maxWorkspaces: plan.maxWorkspaces,
    maxLinksPerWorkspace: plan.maxLinksPerWorkspace,
    maxClicksPerWorkspace: plan.maxClicksPerWorkspace,
    maxGalleries: plan.maxGalleries,
    maxLinksPerBio: plan.maxBioLinks,
    maxUsers: plan.maxUsers,
    maxCustomDomains: plan.maxCustomDomains,
    maxTagsPerWorkspace: plan.maxLinkTags,
    maxUtmTemplates: plan.maxUTM,
  };
}
