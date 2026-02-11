"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { Check } from "lucide-react";
import { createAuthClient } from "better-auth/react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSubscriptionWithPlan } from "@/server/actions/subscription";

// Constants
const CHECKOUT_BASE_URL = "/api/subscription/checkout";
const DEFAULT_MONTHLY_PRICE = 15;
const DEFAULT_YEARLY_PRICE = 150;
const YEARLY_SAVINGS = "2 Months Free";

const CURRENCY_FORMAT = {
  style: "currency" as const,
  currency: "USD",
  maximumFractionDigits: 0,
};

const FEATURES = [
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
] as const;

// Types
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

interface PlanConfigs {
  free: PlanConfig;
  monthly: PlanConfig;
  yearly: PlanConfig;
}

// Auth client
const { useSession } = createAuthClient();

// Utility functions
const getProductIds = (products?: ProductData[]): string[] => {
  const productIds = products?.map((p) => p.id).filter(Boolean) ?? [];

  if (productIds.length > 0) return productIds;

  // Fallback to environment variables
  return [
    process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID,
    process.env.NEXT_PUBLIC_PRO_MONTHLY_PRODUCT_ID,
  ].filter(Boolean) as string[];
};

const buildCheckoutUrl = (
  products?: ProductData[],
  workspace?: string,
  isPaidPlan?: boolean,
): string => {
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
};

const extractPrices = (products?: ProductData[]) => {
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
    yearlyPrice: yearly?.amount ?? DEFAULT_YEARLY_PRICE,
    monthlyPrice: monthly?.amount ?? DEFAULT_MONTHLY_PRICE,
  };
};

const createPlanConfigs = (
  monthlyPrice: number,
  yearlyPrice: number,
): PlanConfigs => ({
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
    savings: YEARLY_SAVINGS,
  },
});

// Sub-components
const FeatureValue = ({ value }: { value: FeatureValue }) => {
  if (value === true) return <Check className="size-4" />;
  if (value === false) return <span className="text-muted-foreground">—</span>;
  return <>{value}</>;
};

const PriceHeader = ({
  plan,
  ctaUrl,
  ctaLabel,
  isPaidPlan,
}: {
  plan: PlanConfig;
  ctaUrl: string;
  ctaLabel: string;
  isPaidPlan?: boolean;
}) => {
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
};

const ProPriceHeader = ({
  plan,
  ctaUrl,
  isPaidPlan,
}: {
  plan: PlanConfig;
  ctaUrl: string;
  isPaidPlan?: boolean;
}) => {
  const buttonText = isPaidPlan ? "Manage" : "Upgrade to Pro";
  const buttonVariant = isPaidPlan ? "outline" : "default";

  return (
    <th className="bg-muted space-y-2 rounded-t-(--radius) px-4">
      <span className="block">{plan.name}</span>
      <span className="block text-2xl font-medium">
        <NumberFlow value={plan.price} format={CURRENCY_FORMAT} />
      </span>
      <span className="text-muted-foreground block text-sm">
        {plan.subtitle}
      </span>
      <Button asChild variant={buttonVariant} size="sm">
        <Link href={ctaUrl}>{buttonText}</Link>
      </Button>
    </th>
  );
};

const FeatureRow = ({ feature }: { feature: Feature }) => (
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

// Main component
export default function AppPricingComparator({
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
    () => createPlanConfigs(monthlyPrice, yearlyPrice),
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
                <PriceHeader
                  plan={plans.free}
                  ctaUrl=""
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
