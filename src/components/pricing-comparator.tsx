"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo, useEffect } from "react";
import NumberFlow from "@number-flow/react";
import { getSubscriptionWithPlan } from "@/server/actions/subscription";
import { createAuthClient } from "better-auth/react";

const { useSession } = createAuthClient();

type FeatureValue = string | boolean;
type PriceInterval = "month" | "year" | null;
type BillingPeriod = "monthly" | "yearly";

interface Feature {
  feature: string;
  free: FeatureValue;
  pro: FeatureValue;
}

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

interface PlanConfig {
  name: string;
  price: number;
  subtitle: string;
  savings?: string;
}

const CHECKOUT_BASE_URL = "/api/subscription/checkout";
const DEFAULT_MONTHLY_PRICE = 15;
const DEFAULT_YEARLY_PRICE = 150;

const CURRENCY_FORMAT = {
  style: "currency" as const,
  currency: "USD",
  maximumFractionDigits: 0,
};

const FEATURES: Feature[] = [
  { feature: "Workspaces", free: "2", pro: "5" },
  { feature: "Links", free: "25 / workspace", pro: "100 / workspace" },
  { feature: "Analytics", free: "1,000 clicks", pro: "15,000 clicks" },
  { feature: "Analytics Retention", free: "30 days", pro: "12 months" },
  { feature: "Advanced Analytics", free: true, pro: true },
  { feature: "Bio Links", free: "5", pro: "15" },
  { feature: "Link Tags", free: "5", pro: "15" },
  { feature: "Custom Domains", free: "2", pro: "10" },
  { feature: "Users", free: "1", pro: "3" },
  { feature: "UTM Templates", free: "5", pro: "15" },
  { feature: "Custom Link Preview", free: false, pro: true },
  { feature: "Link Expiration", free: false, pro: true },
  { feature: "Password Protection", free: false, pro: true },
];

// Extract product IDs from products or environment variables
function getProductIds(products?: ProductData[]): string[] {
  const productIds = products?.map((p) => p.id).filter(Boolean) ?? [];

  if (productIds.length > 0) return productIds;

  // Fallback to environment variables
  return [
    process.env.NEXT_PUBLIC_PRO_MONTHLY_PRODUCT_ID,
    process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID,
  ].filter(Boolean) as string[];
}

// Build checkout URL with products and optional success URL
function buildCheckoutUrl(
  products?: ProductData[],
  workspace?: string,
  isPaidPlan?: boolean,
): string {
  // If user already has Pro plan, return manage URL
  if (isPaidPlan && workspace) {
    return `/api/subscription/manage?returnUrl=${encodeURIComponent(`/${workspace}/settings/billing`)}`;
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

// Extract prices from products with defaults
function extractPrices(products?: ProductData[]) {
  if (!products?.length) {
    return {
      monthlyPrice: DEFAULT_MONTHLY_PRICE,
      yearlyPrice: DEFAULT_YEARLY_PRICE,
    };
  }

  const allPrices = products.flatMap((p) => p.prices);
  const monthly = allPrices.find((p) => p.interval === "month");
  const yearly = allPrices.find((p) => p.interval === "year");

  return {
    monthlyPrice: monthly?.amount ?? DEFAULT_MONTHLY_PRICE,
    yearlyPrice: yearly?.amount ?? DEFAULT_YEARLY_PRICE,
  };
}

// Render feature value as checkmark, dash, or text
function FeatureValue({ value }: { value: FeatureValue }) {
  if (value === true) return <Check className="size-4" />;
  if (value === false) return <span className="text-muted-foreground">—</span>;
  return <>{value}</>;
}

// Price header component
function PriceHeader({
  plan,
  ctaUrl,
  ctaLabel,
  isPaidPlan,
}: {
  plan: PlanConfig;
  ctaUrl: string;
  ctaLabel: string;
  variant?: "outline" | "default";
  isPaidPlan?: boolean;
}) {
  const buttonText = isPaidPlan ? "Manage" : ctaLabel;
  const buttonVariant = isPaidPlan ? "outline" : "default";

  return (
    <th className="space-y-3">
      <span className="block">{plan.name}</span>
      <span className="block text-2xl font-medium">
        <NumberFlow value={plan.price} format={CURRENCY_FORMAT} />
      </span>
      <span className="text-muted-foreground block text-xs">
        {plan.subtitle}
      </span>
      <Button asChild variant={buttonVariant} size="sm">
        <Link href={ctaUrl}>{buttonText}</Link>
      </Button>
    </th>
  );
}

// Pro plan price header with highlighted background
function ProPriceHeader({
  plan,
  ctaUrl,
  isPaidPlan,
}: {
  plan: PlanConfig;
  ctaUrl: string;
  isPaidPlan?: boolean;
}) {
  if (isPaidPlan) {
    // Show manage button for existing Pro users
    return (
      <th className="bg-muted space-y-2 rounded-t-(--radius) px-4">
        <span className="block">{plan.name}</span>
        <span className="block text-2xl font-medium">
          <NumberFlow value={plan.price} format={CURRENCY_FORMAT} />
        </span>
        <span className="text-muted-foreground block text-sm">
          {plan.subtitle}
        </span>
        <Button asChild variant="outline" size="sm">
          <Link href={ctaUrl}>Manage</Link>
        </Button>
      </th>
    );
  }

  // Show upgrade button for free users
  return (
    <th className="bg-muted space-y-2 rounded-t-(--radius) px-4">
      <span className="block">{plan.name}</span>
      <span className="block text-2xl font-medium">
        <NumberFlow value={plan.price} format={CURRENCY_FORMAT} />
      </span>
      <span className="text-muted-foreground block text-sm">
        {plan.subtitle}
      </span>
      <Button asChild variant="default" size="sm">
        <Link href={ctaUrl}>Upgrade to Pro</Link>
      </Button>
    </th>
  );
}

// Feature row component
function FeatureRow({ feature }: { feature: Feature }) {
  return (
    <tr key={feature.feature} className="*:border-b *:py-3">
      <td className="text-muted-foreground">{feature.feature}</td>
      <td>
        <FeatureValue value={feature.free} />
      </td>
      <td className="bg-muted border-none px-4">
        <div className="-mb-3 border-b py-3">
          <FeatureValue value={feature.pro} />
        </div>
      </td>
    </tr>
  );
}

export default function PricingComparator({
  products,
  workspace,
  isPaidPlan,
}: PricingComparatorProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const { data: session } = useSession();

  const { monthlyPrice, yearlyPrice } = useMemo(
    () => extractPrices(products),
    [products],
  );

  const plans = useMemo(
    () => ({
      free: {
        name: "Free",
        price: 0,
        subtitle: "Forever free",
      },
      monthly: {
        name: "Pro",
        price: monthlyPrice,
        subtitle: "per month",
      },
      yearly: {
        name: "Pro",
        price: yearlyPrice,
        subtitle: "per year",
        savings: "2 Months Free",
      },
    }),
    [monthlyPrice, yearlyPrice],
  );

  const proPlan = plans[billingPeriod];
  const checkoutUrl = useMemo(
    () => buildCheckoutUrl(products, workspace, isPaidPlan),
    [products, workspace, isPaidPlan],
  );

  useEffect(() => {
    if (session?.user?.id) {
      getSubscriptionWithPlan(session.user.id).then((result) => {
        console.log("Subscription:", result);
      });
    }
  }, [session?.user?.id]);

  return (
    <section>
      <div className="mx-auto">
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
                Yearly (2 Months Free)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="w-full overflow-auto lg:overflow-visible">
          <table className="w-[200vw] border-separate border-spacing-x-3 md:w-full dark:[--color-muted:var(--color-zinc-900)]">
            <thead className="bg-background sticky top-0">
              <tr className="*:py-4 *:text-left *:font-medium">
                <th className="lg:w-2/5" />
                <PriceHeader
                  plan={plans.free}
                  ctaUrl="/dashboard"
                  ctaLabel="Get Started"
                  isPaidPlan={isPaidPlan}
                />
                <ProPriceHeader
                  plan={proPlan}
                  ctaUrl={checkoutUrl}
                  isPaidPlan={isPaidPlan}
                />
              </tr>
            </thead>

            <tbody className="text-caption text-sm">
              <tr className="*:py-3">
                <td className="font-medium">Features</td>
                <td />
                <td className="bg-muted border-none px-4" />
              </tr>
              {FEATURES.map((feature) => (
                <FeatureRow key={feature.feature} feature={feature} />
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
