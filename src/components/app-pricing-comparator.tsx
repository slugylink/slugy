"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { Check } from "lucide-react";

import { plans } from "@/constants/data/price";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CHECKOUT_BASE_URL = "/api/subscription/checkout";
const MANAGE_BASE_URL = "/api/subscription/manage";
const YEARLY_SAVINGS = "2 Months Free";

const CURRENCY_FORMAT = {
  style: "currency" as const,
  currency: "USD",
  maximumFractionDigits: 0,
};

type BillingPeriod = "monthly" | "yearly";
type FeatureValue = string | boolean | number;
type PriceInterval = "month" | "year" | null;
type Plan = (typeof plans)[number];

interface ProductPrice {
  id: string;
  amount: number;
  currency: string;
  interval: PriceInterval;
}

interface ProductData {
  id: string;
  name: string;
  prices: ProductPrice[];
}

interface PricingComparatorProps {
  products?: ProductData[];
  workspace?: string;
  isPaidPlan?: boolean;
}

interface Feature {
  feature: string;
  free: FeatureValue;
  pro: FeatureValue;
}

const [FREE_PLAN, PRO_PLAN] = (() => {
  const free = plans.find((plan) => plan.planType === "free");
  const pro = plans.find((plan) => plan.planType === "pro");

  if (!free || !pro) {
    throw new Error("Pricing plans are not configured correctly.");
  }

  return [free, pro] as const;
})();

function formatClicks(clicks: number): string {
  if (clicks < 1000) return `${clicks} clicks`;
  const value = clicks / 1000;
  const formatted = Number.isInteger(value)
    ? value.toFixed(0)
    : value.toFixed(1);
  return `${formatted}k clicks`;
}

function buildFeatures(): Feature[] {
  return [
    {
      feature: "Workspaces",
      free: FREE_PLAN.maxWorkspaces,
      pro: PRO_PLAN.maxWorkspaces,
    },
    {
      feature: "Links",
      free: `${FREE_PLAN.maxLinksPerWorkspace} / workspace`,
      pro: `${PRO_PLAN.maxLinksPerWorkspace} / workspace`,
    },
    {
      feature: "Analytics",
      free: formatClicks(FREE_PLAN.maxClicksPerWorkspace),
      pro: formatClicks(PRO_PLAN.maxClicksPerWorkspace),
    },
    {
      feature: "Analytics Retention",
      free: FREE_PLAN.analyticsRetention,
      pro: PRO_PLAN.analyticsRetention,
    },
    { feature: "Advanced Analytics", free: false, pro: true },
    {
      feature: "Bio Links",
      free: FREE_PLAN.maxBioLinks,
      pro: PRO_PLAN.maxBioLinks,
    },
    {
      feature: "Link Tags",
      free: FREE_PLAN.maxLinkTags,
      pro: PRO_PLAN.maxLinkTags,
    },
    {
      feature: "Custom Domains",
      free: FREE_PLAN.maxCustomDomains,
      pro: PRO_PLAN.maxCustomDomains,
    },
    { feature: "Users", free: FREE_PLAN.maxUsers, pro: PRO_PLAN.maxUsers },
    { feature: "UTM Templates", free: FREE_PLAN.maxUTM, pro: PRO_PLAN.maxUTM },
    {
      feature: "Custom Link Preview",
      free: FREE_PLAN.customizeLinkPreview,
      pro: PRO_PLAN.customizeLinkPreview,
    },
    {
      feature: "Link Expiration",
      free: FREE_PLAN.linkExp,
      pro: PRO_PLAN.linkExp,
    },
    {
      feature: "Password Protection",
      free: FREE_PLAN.linkPassword,
      pro: PRO_PLAN.linkPassword,
    },
  ];
}

function getProductIds(products?: ProductData[]): string[] {
  const productIds = products?.map((p) => p.id).filter(Boolean) ?? [];
  if (productIds.length > 0) return productIds;

  return [
    process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID,
    process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID,
  ].filter(Boolean) as string[];
}

function buildProCtaUrl(
  products?: ProductData[],
  workspace?: string,
  isPaidPlan?: boolean,
): string {
  if (isPaidPlan && workspace) {
    return `${MANAGE_BASE_URL}?returnUrl=${encodeURIComponent(`/${workspace}/settings/billing`)}`;
  }

  const productIds = getProductIds(products);
  if (productIds.length === 0) return CHECKOUT_BASE_URL;

  const params = new URLSearchParams();
  params.set("products", productIds.join(","));

  if (workspace) {
    params.set("successUrl", `/${workspace}/settings/billing`);
  }

  return `${CHECKOUT_BASE_URL}?${params.toString()}`;
}

function getProPrices(products?: ProductData[]): {
  monthly: number;
  yearly: number;
} {
  if (!products?.length) {
    return { monthly: PRO_PLAN.monthlyPrice, yearly: PRO_PLAN.yearlyPrice };
  }

  const allPrices = products.flatMap((p) => p.prices);
  const monthly = allPrices.find((p) => p.interval === "month")?.amount;
  const yearly = allPrices.find((p) => p.interval === "year")?.amount;

  return {
    monthly: typeof monthly === "number" ? monthly : PRO_PLAN.monthlyPrice,
    yearly: typeof yearly === "number" ? yearly : PRO_PLAN.yearlyPrice,
  };
}

function FeatureCell({ value }: { value: FeatureValue }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="size-4" />
    ) : (
      <span className="text-muted-foreground">-</span>
    );
  }
  return <>{value}</>;
}

export default function AppPricingComparator({
  products,
  workspace,
  isPaidPlan,
}: PricingComparatorProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  const features = useMemo(() => buildFeatures(), []);
  const proPrices = useMemo(() => getProPrices(products), [products]);
  const proPrice =
    billingPeriod === "yearly" ? proPrices.yearly : proPrices.monthly;
  const proSubtitle = billingPeriod === "yearly" ? "/year" : "/month";
  const proCtaUrl = useMemo(
    () => buildProCtaUrl(products, workspace, isPaidPlan),
    [products, workspace, isPaidPlan],
  );

  const freeCtaUrl = workspace
    ? `/${workspace}/settings/billing`
    : "https://app.slugy.co/login";

  return (
    <section>
      <div className="mx-auto max-w-full">
        <div className="mb-8 flex justify-end">
          <Tabs
            value={billingPeriod}
            onValueChange={(value) => setBillingPeriod(value as BillingPeriod)}
          >
            <TabsList className="flex w-full max-w-md gap-1 border text-sm">
              <TabsTrigger value="monthly" className="text-sm">
                Monthly
              </TabsTrigger>
              <TabsTrigger value="yearly" className="text-sm">
                Yearly ({YEARLY_SAVINGS})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="w-full overflow-auto lg:overflow-visible">
          <table className="w-full border-separate border-spacing-x-3 md:w-full dark:[--color-muted:var(--color-zinc-900)]">
            <thead className="bg-background sticky top-0">
              <tr className="*:py-4 *:text-left *:font-medium">
                <th className="lg:w-2/5" />
                <th className="space-y-3">
                  <span className="block">{FREE_PLAN.name}</span>
                  <span className="block text-2xl font-medium">
                    <NumberFlow
                      value={FREE_PLAN.monthlyPrice}
                      format={CURRENCY_FORMAT}
                    />
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    Forever free
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link href={freeCtaUrl}>Get Started</Link>
                  </Button>
                </th>

                <th className="bg-muted space-y-2 rounded-t-(--radius) px-4">
                  <span className="block">{PRO_PLAN.name}</span>
                  <span className="block text-2xl font-medium">
                    <NumberFlow value={proPrice} format={CURRENCY_FORMAT} />
                  </span>
                  <span className="text-muted-foreground block text-sm">
                    {proSubtitle}
                  </span>
                  <Button
                    asChild
                    variant={isPaidPlan ? "outline" : "default"}
                    size="sm"
                  >
                    <Link href={proCtaUrl}>
                      {isPaidPlan ? "Manage" : PRO_PLAN.buttonLabel}
                    </Link>
                  </Button>
                </th>
              </tr>
            </thead>

            <tbody className="text-caption text-sm">
              <tr className="*:py-3">
                <td className="font-medium">Features</td>
                <td />
                <td className="bg-muted border-none px-4" />
              </tr>

              {features.map((feature) => (
                <tr key={feature.feature} className="*:border-b *:py-3">
                  <td className="text-muted-foreground">{feature.feature}</td>
                  <td>
                    <FeatureCell value={feature.free} />
                  </td>
                  <td className="bg-muted border-none px-4">
                    <div className="-mb-3 border-b py-3">
                      <FeatureCell value={feature.pro} />
                    </div>
                  </td>
                </tr>
              ))}

              <tr className="*:py-6">
                <td />
                <td />
                <td className="bg-muted rounded-b-(--radius) border-none px-4" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
