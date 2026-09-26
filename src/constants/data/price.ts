export type BillingPeriod = "monthly" | "yearly";
export type PlanType = "free" | "basic" | "pro" | "business";
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
  basic: PricingFeatureValue;
  pro: PricingFeatureValue;
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
const BUSINESS_MONTHLY_PRICE = 29;
const BUSINESS_YEARLY_PRICE = 290;

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
  description:
    "Perfect for individuals and small teams who need advanced features.",
  monthlyPrice: PRO_MONTHLY_PRICE,
  yearlyPrice: PRO_YEARLY_PRICE,
  monthlyPriceId: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID || "",
  yearlyPriceId: process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID || "",
  isRecommended: true,
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

export const BUSINESS_PLAN: Plan = {
  name: "Business",
  description: "For teams and agencies running links at scale.",
  monthlyPrice: BUSINESS_MONTHLY_PRICE,
  yearlyPrice: BUSINESS_YEARLY_PRICE,
  monthlyPriceId: process.env.NEXT_PUBLIC_BUSINESS_MONTHLY_PRICE_ID || "",
  yearlyPriceId: process.env.NEXT_PUBLIC_BUSINESS_YEARLY_PRICE_ID || "",
  isRecommended: false,
  buttonLabel: "Get Business",
  isReady: true,
  yearlyDiscount: getYearlyDiscountPercent(
    BUSINESS_MONTHLY_PRICE,
    BUSINESS_YEARLY_PRICE,
  ),
  planType: "business",
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
  analyticsRetention: "24 months",
  customizeLinkPreview: true,
  features: [
    "10 workspaces",
    "1500 new links/month",
    "50k tracked clicks/month",
    "Custom link preview",
    "Link expiration",
    "Password protection",
    "Geo targeting",
    "30 links/bio links",
    "Up to 5 team members",
    "30 link tags",
    "24 months analytics retention",
    "Priority support",
    "10 custom domains",
    "30 UTM templates",
    "Bulk link creation",
  ],
};

export const plans: Plan[] = [FREE_PLAN, PRO_PLAN, BUSINESS_PLAN];

export const PRICING_COMPARISON_FEATURES: PricingComparisonRow[] = [
  {
    feature: "Workspaces",
    basic: BASIC_PLAN.maxWorkspaces,
    pro: PRO_PLAN.maxWorkspaces,
  },
  {
    feature: "Links",
    basic: `${BASIC_PLAN.maxLinksPerWorkspace} / workspace`,
    pro: `${PRO_PLAN.maxLinksPerWorkspace} / workspace`,
  },
  {
    feature: "Analytics",
    basic: formatClicks(BASIC_PLAN.maxClicksPerWorkspace),
    pro: formatClicks(PRO_PLAN.maxClicksPerWorkspace),
  },
  {
    feature: "Analytics Retention",
    basic: BASIC_PLAN.analyticsRetention,
    pro: PRO_PLAN.analyticsRetention,
  },
  { feature: "Advanced Analytics", basic: false, pro: true },
  {
    feature: "Bio Links",
    basic: BASIC_PLAN.maxBioLinks,
    pro: PRO_PLAN.maxBioLinks,
  },
  {
    feature: "Link Tags",
    basic: BASIC_PLAN.maxLinkTags,
    pro: PRO_PLAN.maxLinkTags,
  },
  {
    feature: "Custom Domains",
    basic: BASIC_PLAN.maxCustomDomains,
    pro: PRO_PLAN.maxCustomDomains,
  },
  { feature: "Users", basic: BASIC_PLAN.maxUsers, pro: PRO_PLAN.maxUsers },
  {
    feature: "UTM Templates",
    basic: BASIC_PLAN.maxUTM,
    pro: PRO_PLAN.maxUTM,
  },
  {
    feature: "Custom Link Preview",
    basic: BASIC_PLAN.customizeLinkPreview,
    pro: PRO_PLAN.customizeLinkPreview,
  },
  {
    feature: "Link Expiration",
    basic: BASIC_PLAN.linkExp,
    pro: PRO_PLAN.linkExp,
  },
  {
    feature: "Password Protection",
    basic: BASIC_PLAN.linkPassword,
    pro: PRO_PLAN.linkPassword,
  },
  {
    feature: "Geo Targeting",
    basic: BASIC_PLAN.linkGeoTargeting,
    pro: PRO_PLAN.linkGeoTargeting,
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
