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
  successUrlPath?: string;
}

interface Feature {
  feature: string;
  basic: FeatureValue;
  pro: FeatureValue;
}

const [BASIC_PLAN, PRO_PLAN] = (() => {
  const basic = plans.find((plan) => plan.planType === "basic");
  const pro = plans.find((plan) => plan.planType === "pro");

  if (!basic || !pro) {
    throw new Error("Pricing plans are not configured correctly.");
  }

  return [basic, pro] as const;
})();

function getPlanTypeFromProductName(name?: string): "basic" | "pro" | null {
  const normalized = (name ?? "").toLowerCase().trim();
  if (!normalized) return null;
  if (normalized.includes("basic")) return "basic";
  if (normalized.includes("pro")) return "pro";
  return null;
}

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
  ];
}

function getProductIdsByPlanType(
  planType: "basic" | "pro",
  products?: ProductData[],
): string[] {
  const productIds =
    products
      ?.filter((p) => getPlanTypeFromProductName(p.name) === planType)
      .map((p) => p.id)
      .filter(Boolean) ?? [];
  if (productIds.length > 0) return productIds;

  if (planType === "basic") {
    return [process.env.NEXT_PUBLIC_BASIC_PRICE_ID].filter(Boolean) as string[];
  }

  return [
    process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID,
    process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID,
  ].filter(Boolean) as string[];
}

function buildProCtaUrl(
  products?: ProductData[],
  workspace?: string,
  isPaidPlan?: boolean,
  successUrlPath?: string,
): string {
  if (isPaidPlan && workspace) {
    return `${MANAGE_BASE_URL}?returnUrl=${encodeURIComponent(`/${workspace}/settings/billing`)}`;
  }

  const productIds = getProductIdsByPlanType("pro", products);
  if (productIds.length === 0) return CHECKOUT_BASE_URL;

  const params = new URLSearchParams();
  params.set("products", productIds.join(","));

  if (successUrlPath) {
    params.set("successUrl", successUrlPath);
  } else if (workspace) {
    params.set("successUrl", `/${workspace}/settings/billing`);
  }

  return `${CHECKOUT_BASE_URL}?${params.toString()}`;
}

function buildBasicCtaUrl(
  products?: ProductData[],
  workspace?: string,
  successUrlPath?: string,
): string {
  if (!workspace) return "https://app.slugy.co/login";

  const productIds = getProductIdsByPlanType("basic", products);
  if (productIds.length === 0) return CHECKOUT_BASE_URL;

  const params = new URLSearchParams();
  params.set("products", productIds.join(","));
  if (successUrlPath) {
    params.set("successUrl", successUrlPath);
  } else {
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

  const allPrices = products
    .filter((p) => getPlanTypeFromProductName(p.name) === "pro")
    .flatMap((p) => p.prices);
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
  successUrlPath,
}: PricingComparatorProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  const features = useMemo(() => buildFeatures(), []);
  const proPrices = useMemo(() => getProPrices(products), [products]);
  const proPrice =
    billingPeriod === "yearly" ? proPrices.yearly : proPrices.monthly;
  const proSubtitle = billingPeriod === "yearly" ? "/year" : "/month";
  const proCtaUrl = useMemo(
    () => buildProCtaUrl(products, workspace, isPaidPlan, successUrlPath),
    [products, workspace, isPaidPlan, successUrlPath],
  );
  const basicCtaUrl = useMemo(
    () => buildBasicCtaUrl(products, workspace, successUrlPath),
    [products, workspace, successUrlPath],
  );

  return (
    <section>
      <div className="mx-auto max-w-full">
        <div className="mb-6 flex justify-center sm:mb-8 sm:justify-end">
          <Tabs
            value={billingPeriod}
            onValueChange={(value) => setBillingPeriod(value as BillingPeriod)}
          >
            <TabsList className="flex w-full max-w-md gap-1 border text-xs sm:text-sm">
              <TabsTrigger value="monthly" className="text-sm">
                Monthly
              </TabsTrigger>
              <TabsTrigger value="yearly" className="text-sm">
                Yearly ({YEARLY_SAVINGS})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-4 md:hidden">
          <div className="grid gap-3">
            <div className="rounded-lg border p-4">
              <p className="font-medium">{BASIC_PLAN.name}</p>
              <p className="mt-1 text-2xl font-medium">
                <NumberFlow
                  value={BASIC_PLAN.monthlyPrice}
                  format={CURRENCY_FORMAT}
                />
              </p>
              <p className="text-muted-foreground text-xs">Forever</p>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-3 w-full"
              >
                <Link href={basicCtaUrl}>Get Basic</Link>
              </Button>
            </div>

            <div className="bg-muted rounded-lg border p-4">
              <p className="font-medium">{PRO_PLAN.name}</p>
              <p className="mt-1 text-2xl font-medium">
                <NumberFlow value={proPrice} format={CURRENCY_FORMAT} />
              </p>
              <p className="text-muted-foreground text-xs">{proSubtitle}</p>
              <Button
                asChild
                variant={isPaidPlan ? "outline" : "default"}
                size="sm"
                className="mt-3 w-full"
              >
                <Link href={proCtaUrl}>
                  {isPaidPlan ? "Manage" : PRO_PLAN.buttonLabel}
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="border-b px-4 py-3 font-medium">Features</div>
            <div className="divide-y">
              {features.map((feature) => (
                <div
                  key={feature.feature}
                  className="space-y-2 px-4 py-3 text-sm"
                >
                  <p className="text-muted-foreground">{feature.feature}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border px-2 py-1">
                      <span className="text-muted-foreground mr-1">Basic:</span>
                      <FeatureCell value={feature.basic} />
                    </div>
                    <div className="rounded-md border px-2 py-1">
                      <span className="text-muted-foreground mr-1">Pro:</span>
                      <FeatureCell value={feature.pro} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden w-full overflow-auto md:block lg:overflow-visible">
          <table className="w-full border-separate border-spacing-x-3 md:w-full dark:[--color-muted:var(--color-zinc-900)]">
            <thead className="bg-background sticky top-0">
              <tr className="*:py-4 *:text-left *:font-medium">
                <th className="lg:w-2/5" />
                <th className="space-y-3 bg-white">
                  <span className="block">{BASIC_PLAN.name}</span>
                  <span className="block text-2xl font-medium">
                    <NumberFlow
                      value={BASIC_PLAN.monthlyPrice}
                      format={CURRENCY_FORMAT}
                    />
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    Forever
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link href={basicCtaUrl}>Get Basic</Link>
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
                    <FeatureCell value={feature.basic} />
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
