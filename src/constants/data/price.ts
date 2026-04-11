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
  planType: "basic" | "pro";
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

const PRO_PLAN: Plan = {
  name: "Pro",
  description:
    "Perfect for individuals and small teams who need advanced features.",
  monthlyPrice: 10,
  yearlyPrice: 100,
  monthlyPriceId: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID!,
  yearlyPriceId: process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID!,
  isRecommended: true,
  buttonLabel: "Get Pro",
  isReady: true,
  yearlyDiscount: 16.67,
  planType: "pro",
  currency: "USD",
  interval: "month",
  // Limits
  maxWorkspaces: 5,
  maxLinksPerWorkspace: 100,
  maxClicksPerWorkspace: 12000,
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
    "12k tracked clicks/month",
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
};

const BASIC_PLAN: Plan = {
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
  // Limits
  maxWorkspaces: 2,
  maxLinksPerWorkspace: 20,
  maxClicksPerWorkspace: 1000,
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
    "20 links/workspace",
    "1k tracked clicks/month",
    "Basic analytics",
    "Basic QR codes",
    "5 links/bio links",
    "2 custom domains",
    "1 user",
    "Community support",
    "5 link tags",
  ],
};

export const plans: Plan[] = [BASIC_PLAN, PRO_PLAN];
