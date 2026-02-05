"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo, useEffect } from "react";
import NumberFlow from "@number-flow/react";
import { getActiveSubscription, getSubscriptionWithPlan } from "@/server/actions/subscription";
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

/**
 * Generates checkout URL with product IDs from products or environment variables
 */
function getCheckoutUrl(products?: ProductData[]): string {
  const productIds = products?.map((p) => p.id).filter(Boolean) ?? [];

  if (productIds.length > 0) {
    return `${CHECKOUT_BASE_URL}?products=${productIds.join(",")}`;
  }

  // Fallback to environment variables (Polar product IDs for checkout URL)
  const envIds = [
    process.env.NEXT_PUBLIC_PRO_MONTHLY_PRODUCT_ID,
    process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID,
  ].filter(Boolean) as string[];

  return envIds.length > 0
    ? `${CHECKOUT_BASE_URL}?products=${envIds.join(",")}`
    : CHECKOUT_BASE_URL;
}

/**
 * Extracts monthly and yearly prices from products array
 */
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

/**
 * Renders feature value as checkmark, dash, or text
 */
function renderFeatureValue(value: FeatureValue) {
  if (value === true) return <Check className="size-4" />;
  if (value === false) return <span className="text-muted-foreground">—</span>;
  return value;
}

export default function PricingComparator({ products }: PricingComparatorProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  const { monthlyPrice, yearlyPrice } = useMemo(
    () => extractPrices(products),
    [products]
  );

  const pricingPlans = useMemo(
    () => ({
      free: {
        name: "Free",
        price: 0,
        subtitle: "Forever free",
        variant: "outline" as const,
      },
      pro: {
        name: "Pro",
        monthly: { price: monthlyPrice, subtitle: "per month" },
        yearly: { price: yearlyPrice, subtitle: "per year", savings: "2 Months Free" },
        variant: "default" as const,
      },
    }),
    [monthlyPrice, yearlyPrice]
  );

  const proPlan = pricingPlans.pro[billingPeriod];
  const checkoutUrl = useMemo(() => getCheckoutUrl(products), [products]);

  const { data: session } = useSession();

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
                <th className="space-y-3">
                  <span className="block">{pricingPlans.free.name}</span>
                  <span className="block text-2xl font-medium">
                    <NumberFlow value={pricingPlans.free.price} format={CURRENCY_FORMAT} />
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {pricingPlans.free.subtitle}
                  </span>
                  <Button asChild variant={pricingPlans.free.variant} size="sm">
                    <Link href="/dashboard">Get Started</Link>
                  </Button>
                </th>
                <th className="bg-muted space-y-2 rounded-t-(--radius) px-4">
                  <span className="block">{pricingPlans.pro.name}</span>
                  <span className="block text-2xl font-medium">
                    <NumberFlow value={proPlan.price} format={CURRENCY_FORMAT} />
                  </span>
                  <span className="text-muted-foreground block text-sm">
                    {proPlan.subtitle}
                  </span>
                  <Button asChild variant={pricingPlans.pro.variant} size="sm">
                    <Link href={checkoutUrl}>Upgrade to Pro</Link>
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
              {FEATURES.map((row) => (
                <tr key={row.feature} className="*:border-b *:py-3">
                  <td className="text-muted-foreground">{row.feature}</td>
                  <td>{renderFeatureValue(row.free)}</td>
                  <td className="bg-muted border-none px-4">
                    <div className="-mb-3 border-b py-3">
                      {renderFeatureValue(row.pro)}
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
