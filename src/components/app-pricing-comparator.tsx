"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PromoPrice } from "@/components/promo-price";
import { Check } from "lucide-react";

import {
  plans,
  PRICING_COPY,
  getPlanPrice,
  getPlanPromoPrice,
  getPlanPriceSubtitle,
  type BillingPeriod,
  type Plan,
  type PricingFeatureValue,
} from "@/constants/data/price";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const CHECKOUT_BASE_URL = "/api/subscription/checkout";
const MANAGE_BASE_URL = "/api/subscription/manage";
type PriceInterval = "month" | "year" | null;
type PaidPlanType = "pro" | "business";

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
  currentPlanType?: "free" | "basic" | "pro" | "business" | null;
  successUrlPath?: string;
}

/** Product name → paid plan bucket (Polar products). */
function getPlanTypeFromProductName(name?: string): PaidPlanType | null {
  const normalized = (name ?? "").toLowerCase().trim();
  if (!normalized) return null;
  if (normalized.includes("business")) return "business";
  if (normalized.includes("pro")) return "pro";
  return null;
}

/**
 * Resolve the Polar product IDs to send to checkout for a paid plan.
 * Prefers the plan's configured price ID, then falls back to matching the
 * Polar product name + billing interval.
 */
function getProductIdsByPlanType(
  planType: PaidPlanType,
  products?: ProductData[],
  billing: BillingPeriod = "monthly",
): string[] {
  const plan = plans.find((p) => p.planType === planType);
  const configured =
    billing === "yearly" ? plan?.yearlyPriceId : plan?.monthlyPriceId;
  if (configured) return [configured];

  const interval = billing === "yearly" ? "year" : "month";
  return (
    products
      ?.filter((product) => {
        if (getPlanTypeFromProductName(product.name) !== planType) return false;
        return product.prices.some(
          (price) => price.interval === interval || price.interval === null,
        );
      })
      .map((product) => product.id)
      .filter(Boolean) ?? []
  );
}

function buildCheckoutUrl(
  planType: PaidPlanType,
  products?: ProductData[],
  workspace?: string,
  successUrlPath?: string,
  billing: BillingPeriod = "monthly",
): string {
  const productIds = getProductIdsByPlanType(planType, products, billing);
  if (productIds.length === 0) return CHECKOUT_BASE_URL;

  const params = new URLSearchParams();
  params.set("products", productIds.join(","));
  params.set("billing", billing);

  if (successUrlPath) {
    params.set("successUrl", successUrlPath);
  } else if (workspace) {
    params.set("successUrl", `/${workspace}/settings/billing`);
  }

  return `${CHECKOUT_BASE_URL}?${params.toString()}`;
}

function manageUrl(workspace?: string): string {
  return workspace
    ? `${MANAGE_BASE_URL}?returnUrl=${encodeURIComponent(`/${workspace}/settings/billing`)}`
    : MANAGE_BASE_URL;
}

function PlanCta({
  plan,
  currentPlanType,
  products,
  workspace,
  successUrlPath,
  billing,
  className,
}: {
  plan: Plan;
  currentPlanType: PricingComparatorProps["currentPlanType"];
  products?: ProductData[];
  workspace?: string;
  successUrlPath?: string;
  billing: BillingPeriod;
  className?: string;
}) {
  const isCurrent = currentPlanType === plan.planType;

  if (plan.planType === "free") {
    return (
      <Button variant="outline" size="sm" className={className} disabled>
        {isCurrent ? "Currently active" : "Included"}
      </Button>
    );
  }

  if (isCurrent) {
    return (
      <Button asChild variant="outline" size="sm" className={className}>
        <Link href={manageUrl(workspace)}>Manage</Link>
      </Button>
    );
  }

  // `plans` only contains free/pro/business; guard for legacy "basic".
  if (plan.planType !== "pro" && plan.planType !== "business") {
    return (
      <Button variant="outline" size="sm" className={className} disabled>
        Unavailable
      </Button>
    );
  }

  const href = buildCheckoutUrl(
    plan.planType,
    products,
    workspace,
    successUrlPath,
    billing,
  );

  return (
    <Button
      asChild
      variant={plan.isRecommended ? "default" : "outline"}
      size="sm"
      className={className}
    >
      <Link href={href}>{plan.buttonLabel}</Link>
    </Button>
  );
}

function formatClicks(clicks: number): string {
  if (clicks < 1000) return `${clicks} clicks`;
  const value = clicks / 1000;
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}k clicks`;
}

function FeatureCell({ value }: { value: PricingFeatureValue }) {
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
  currentPlanType,
  successUrlPath,
}: PricingComparatorProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  // A paid plan (legacy flag) always counts as Pro at minimum.
  const activePlan: PricingComparatorProps["currentPlanType"] =
    currentPlanType ?? (isPaidPlan ? "pro" : "free");

  const highlightIndex = Math.max(
    0,
    plans.findIndex((p) => p.isRecommended),
  );

  const compareRows = useMemo(
    () => [
      { feature: "Workspaces", get: (p: Plan) => p.maxWorkspaces },
      {
        feature: "Links",
        get: (p: Plan) => `${p.maxLinksPerWorkspace} new / month`,
      },
      {
        feature: "Tracked clicks",
        get: (p: Plan) => formatClicks(p.maxClicksPerWorkspace),
      },
      {
        feature: "Analytics Retention",
        get: (p: Plan) => p.analyticsRetention,
      },
      { feature: "Bio Links", get: (p: Plan) => p.maxBioLinks },
      { feature: "Link Tags", get: (p: Plan) => p.maxLinkTags },
      { feature: "Custom Domains", get: (p: Plan) => p.maxCustomDomains },
      { feature: "Team members", get: (p: Plan) => p.maxUsers },
      { feature: "UTM Templates", get: (p: Plan) => p.maxUTM },
      {
        feature: "Custom Link Preview",
        get: (p: Plan) => p.customizeLinkPreview,
      },
      { feature: "Link Expiration", get: (p: Plan) => p.linkExp },
      { feature: "Password Protection", get: (p: Plan) => p.linkPassword },
      { feature: "Geo Targeting", get: (p: Plan) => p.linkGeoTargeting },
      { feature: "Click analytics", get: () => true },
      {
        feature: "Lead conversion tracking",
        get: (p: Plan) => p.planType === "pro" || p.planType === "business",
      },
      {
        feature: "Sales analytics",
        get: (p: Plan) => p.planType === "business",
      },
    ],
    [],
  );

  return (
    <section>
      <div className="mx-auto max-w-full">
        <p className="text-primary mb-4 text-center text-sm font-medium sm:text-left">
          {PRICING_COPY.promoPrefix}{" "}
          <span className="rounded bg-red-500/10 px-2 py-1">
            {PRICING_COPY.promoCode}
          </span>{" "}
          {PRICING_COPY.promoSuffix}
        </p>

        <div className="mb-6 flex justify-center pt-3 sm:mb-8">
          <Tabs
            value={billingPeriod}
            onValueChange={(value) => setBillingPeriod(value as BillingPeriod)}
          >
            <TabsList className="relative flex w-full max-w-md gap-1 overflow-visible border text-xs sm:text-sm">
              <TabsTrigger value="monthly" className="text-sm">
                Monthly
              </TabsTrigger>
              <TabsTrigger
                value="yearly"
                className="relative overflow-visible text-sm"
              >
                Yearly
                <Badge className="absolute -top-4 left-1/2 z-10 -translate-x-1/2 bg-blue-500 px-1.5 py-0 text-[10px] leading-4">
                  {PRICING_COPY.yearlySavings}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Mobile: stacked cards */}
        <div className="grid gap-4 md:hidden">
          {plans.map((plan) => (
            <div
              key={plan.planType}
              className={
                plan.isRecommended
                  ? "bg-muted rounded-lg border p-4"
                  : "rounded-lg border p-4"
              }
            >
              <div className="flex items-center gap-2">
                <p className="font-medium">{plan.name}</p>
                {plan.isRecommended && (
                  <Badge className="bg-orange-200 px-2 py-0 text-[10px] font-semibold tracking-wide text-orange-900 uppercase hover:bg-orange-200">
                    Best value
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-2xl font-medium">
                <PromoPrice
                  price={getPlanPrice(plan, billingPeriod)}
                  promoPrice={getPlanPromoPrice(plan, billingPeriod)}
                />
                <span className="text-muted-foreground ml-1 text-sm font-normal">
                  {getPlanPriceSubtitle(plan, billingPeriod) === "Forever"
                    ? ""
                    : getPlanPriceSubtitle(plan, billingPeriod)}
                </span>
              </p>
              <ul className="mt-3 space-y-1.5">
                {plan.features.slice(0, 6).map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <PlanCta
                plan={plan}
                currentPlanType={activePlan}
                products={products}
                workspace={workspace}
                successUrlPath={successUrlPath}
                billing={billingPeriod}
                className="mt-4 w-full"
              />
            </div>
          ))}
        </div>

        {/* Desktop: comparison table */}
        <div className="hidden w-full overflow-auto md:block lg:overflow-visible">
          <table className="w-full border-separate border-spacing-x-3 dark:[--color-muted:var(--color-zinc-900)]">
            <thead className="bg-background sticky top-0">
              <tr className="*:py-4 *:text-left *:font-medium">
                <th className="lg:w-1/4" />
                {plans.map((plan, i) => (
                  <th
                    key={plan.planType}
                    className={
                      i === highlightIndex
                        ? "bg-muted space-y-3 rounded-t-(--radius) px-4"
                        : "space-y-3 bg-white px-2"
                    }
                  >
                    <span className="flex items-center gap-2">
                      {plan.name}
                      {plan.isRecommended && (
                        <Badge className="bg-orange-200 px-2 py-0 text-[10px] font-semibold tracking-wide text-orange-900 uppercase hover:bg-orange-200">
                          Best value
                        </Badge>
                      )}
                    </span>
                    <span className="block text-2xl font-medium">
                      <PromoPrice
                        price={getPlanPrice(plan, billingPeriod)}
                        promoPrice={getPlanPromoPrice(plan, billingPeriod)}
                      />
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {getPlanPriceSubtitle(plan, billingPeriod)}
                    </span>
                    <PlanCta
                      plan={plan}
                      currentPlanType={activePlan}
                      products={products}
                      workspace={workspace}
                      successUrlPath={successUrlPath}
                      billing={billingPeriod}
                    />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="text-caption text-sm">
              <tr className="*:py-3">
                <td className="font-medium">Features</td>
                {plans.map((plan, i) => (
                  <td
                    key={plan.planType}
                    className={
                      i === highlightIndex
                        ? "bg-muted border-none px-4"
                        : undefined
                    }
                  />
                ))}
              </tr>

              {compareRows.map((row) => (
                <tr key={row.feature} className="*:border-b *:py-3">
                  <td className="text-muted-foreground">{row.feature}</td>
                  {plans.map((plan, i) => {
                    const value = row.get(plan);
                    return i === highlightIndex ? (
                      <td
                        key={plan.planType}
                        className="bg-muted border-none px-4"
                      >
                        <div className="-mb-3 border-b py-3">
                          <FeatureCell value={value} />
                        </div>
                      </td>
                    ) : (
                      <td key={plan.planType} className="px-2">
                        <FeatureCell value={value} />
                      </td>
                    );
                  })}
                </tr>
              ))}

              <tr className="*:py-6">
                <td />
                {plans.map((plan, i) => (
                  <td
                    key={plan.planType}
                    className={
                      i === highlightIndex
                        ? "bg-muted rounded-b-(--radius) border-none px-4"
                        : undefined
                    }
                  />
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
