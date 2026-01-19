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
  planType: "free" | "pro";
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
  linkExp: boolean;
  linkPassword: boolean;
  analyticsRetention: string;
  customizeLinkPreview: boolean;
  features: string[];
}

export const plans: Plan[] = [
  {
    name: "Free",
    description: "Get started with basic link shortening for personal use.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyPriceId: "",
    yearlyPriceId: "",
    isRecommended: false,
    buttonLabel: "Start for free",
    isReady: true,
    yearlyDiscount: 0,
    planType: "free",
    currency: "USD",
    interval: "month",
    //limits:
    maxWorkspaces: 2,
    maxLinksPerWorkspace: 25,
    maxClicksPerWorkspace: 1000, // 1000 clicks per month  (analytics)
    maxUsers: 1,
    maxCustomDomains: 2,
    maxBioLinks: 5,
    maxLinkTags: 5,
    maxUTM: 5,
    linkExp: false,
    linkPassword: false,
    analyticsRetention: "30 days",
    customizeLinkPreview: false,
    features: [
      "2 workspaces",
      "25 links/workspace",
      "1k tracked clicks/month",
      "Advanced analytics",
      "Basic QR codes",
      "5 links/bio links",
      "2 custom domains",
      "1 user",
      "Community support",
      "5 link tags",
    ],
  },
  {
    name: "Pro",
    description:
      "Perfect for individuals and small teams who need advanced features.",
    monthlyPrice: 12,
    yearlyPrice: 120,
    monthlyPriceId: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRODUCT_ID!,
    yearlyPriceId: process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID!,
    isRecommended: true,
    buttonLabel: "Get pro",
    isReady: false,
    yearlyDiscount: 16.67, // (12 * 12 - 120) / (12 * 12) * 100 = 16.67%
    planType: "pro",
    currency: "USD",
    interval: "month",
    //limits:
    maxWorkspaces: 5,
    maxLinksPerWorkspace: 100,
    maxClicksPerWorkspace: 15000,  // 15000 clicks per month  (analytics)
    maxUsers: 3,
    maxCustomDomains: 10,
    maxBioLinks: 15,
    maxLinkTags: 15,
    maxUTM: 15,
    linkExp: true,
    linkPassword: true,
    analyticsRetention: "12 months",
    customizeLinkPreview: true,
    features: [
      "5 workspaces",
      "100 links/workspace",
      "15k tracked clicks/month",
      "Custom link preview",
      "Link expiration",
      "Password protection",
      "15 links/bio links",
      "Up to 3 team members",
      "15 link tags",
      "12 months analytics retention",
      "Priority email support",
      "10 custom domains",
    ],
  },
];
