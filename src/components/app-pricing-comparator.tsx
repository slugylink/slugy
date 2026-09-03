"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { Check } from "lucide-react";

import {
  BASIC_PLAN,
  PRO_PLAN,
  PRICING_COMPARISON_FEATURES,
  PRICING_COPY,
  PRICING_CURRENCY_FORMAT,
  getPlanPrice,
  getPlanPriceSubtitle,
  type BillingPeriod,
  type PricingFeatureValue,
} from "@/constants/data/price";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const CHECKOUT_BASE_URL = "/api/subscription/checkout";
const MANAGE_BASE_URL = "/api/subscription/manage";
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
  currentPlanType?: "basic" | "pro" | null;
  successUrlPath?: string;
}

function getPlanTypeFromProductName(name?: string): "basic" | "pro" | null {
  const normalized = (name ?? "").toLowerCase().trim();
  if (!normalized) return null;
  if (normalized.includes("basic")) return "basic";
  if (normalized.includes("pro")) return "pro";
  return null;
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
    return [BASIC_PLAN.monthlyPriceId].filter(Boolean);
  }

  return [PRO_PLAN.yearlyPriceId, PRO_PLAN.monthlyPriceId].filter(Boolean);
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
  if (!workspace) return PRICING_COPY.loginUrl;

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

function PlanCtaButton({
  href,
  label,
  isCurrent,
  variant,
  className,
}: {
  href: string;
  label: string;
  isCurrent: boolean;
  variant: "outline" | "default";
  className?: string;
}) {
  if (isCurrent) {
    return (
      <Button variant="outline" size="sm" className={className} disabled>
        Currently active
      </Button>
    );
  }

  return (
    <Button asChild variant={variant} size="sm" className={className}>
      <Link href={href}>{label}</Link>
    </Button>
  );
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
  const isBasicCurrent = currentPlanType === "basic";
  const isProCurrent = currentPlanType === "pro" || Boolean(isPaidPlan);

  const features = PRICING_COMPARISON_FEATURES;
  const proPrice = getPlanPrice(PRO_PLAN, billingPeriod);
  const proSubtitle = getPlanPriceSubtitle(PRO_PLAN, billingPeriod);
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

        <div className="space-y-4 md:hidden">
          <div className="grid gap-3">
            <div className="rounded-lg border p-4">
              <p className="font-medium">{BASIC_PLAN.name}</p>
              <p className="mt-1 text-2xl font-medium">
                <NumberFlow
                  value={BASIC_PLAN.monthlyPrice}
                  locales="en-US"
                  format={PRICING_CURRENCY_FORMAT}
                />
              </p>
              <p className="text-muted-foreground text-xs">
                {getPlanPriceSubtitle(BASIC_PLAN, billingPeriod)}
              </p>
              <PlanCtaButton
                href={basicCtaUrl}
                label={BASIC_PLAN.buttonLabel}
                isCurrent={isBasicCurrent}
                variant="outline"
                className="mt-3 w-full"
              />
            </div>

            <div className="bg-muted rounded-lg border p-4">
              <p className="font-medium">{PRO_PLAN.name}</p>
              <p className="mt-1 text-2xl font-medium">
                <NumberFlow
                  value={proPrice}
                  locales="en-US"
                  format={PRICING_CURRENCY_FORMAT}
                />
              </p>
              <p className="text-muted-foreground text-xs">{proSubtitle}</p>
              <PlanCtaButton
                href={proCtaUrl}
                label={isProCurrent ? "Manage" : PRO_PLAN.buttonLabel}
                isCurrent={false}
                variant={isProCurrent ? "outline" : "default"}
                className="mt-3 w-full"
              />
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
                      locales="en-US"
                      format={PRICING_CURRENCY_FORMAT}
                    />
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {getPlanPriceSubtitle(BASIC_PLAN, billingPeriod)}
                  </span>
                  <PlanCtaButton
                    href={basicCtaUrl}
                    label={BASIC_PLAN.buttonLabel}
                    isCurrent={isBasicCurrent}
                    variant="outline"
                  />
                </th>

                <th className="bg-muted space-y-2 rounded-t-(--radius) px-4">
                  <span className="block">{PRO_PLAN.name}</span>
                  <span className="block text-2xl font-medium">
                    <NumberFlow
                      value={proPrice}
                      locales="en-US"
                      format={PRICING_CURRENCY_FORMAT}
                    />
                  </span>
                  <span className="text-muted-foreground block text-sm">
                    {proSubtitle}
                  </span>
                  <PlanCtaButton
                    href={proCtaUrl}
                    label={isProCurrent ? "Manage" : PRO_PLAN.buttonLabel}
                    isCurrent={false}
                    variant={isProCurrent ? "outline" : "default"}
                  />
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
