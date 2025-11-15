"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import NumberFlow from "@number-flow/react";

type FeatureValue = string | boolean;

interface Feature {
  feature: string;
  free: FeatureValue;
  pro: FeatureValue;
}

const tableData: Feature[] = [
  { feature: "Workspaces", free: "2", pro: "8" },
  { feature: "Links", free: "25 / workspace", pro: "100 / workspace" },
  { feature: "Analytics", free: "1,000 clicks", pro: "20,000 clicks" },
  {
    feature: "Analytics Retention",
    free: "Up to 2 months",
    pro: "Up to 12 months",
  },
  { feature: "Advanced Analytics", free: false, pro: true },
  { feature: "Bio Links", free: "5", pro: "20" },
  { feature: "Link Tags", free: "5", pro: "20" },
  { feature: "Custom Domains", free: "2", pro: "10" },
  { feature: "Users", free: "1", pro: "3" },
  { feature: "UTM Templates", free: "2", pro: "10" },
  { feature: "Custom Link Preview", free: false, pro: true },
  { feature: "Link Expiration", free: false, pro: true },
  { feature: "Password Protection", free: false, pro: true },
];

const pricingPlans = {
  free: {
    name: "Free",
    price: 0,
    subtitle: "Forever free",
    variant: "outline" as const,
  },
  pro: {
    name: "Pro",
    monthly: {
      price: 15,
      subtitle: "per month",
    },
    yearly: {
      price: 150,
      subtitle: "per year",
      savings: "2 Months Free",
    },
    variant: "default" as const,
  },
};

function renderFeatureValue(value: FeatureValue) {
  if (value === true) {
    return <Check className="size-4" />;
  }
  if (value === false) {
    return <span className="text-muted-foreground">—</span>;
  }
  return value;
}

export default function PricingComparator() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const proPlan = pricingPlans.pro[billingPeriod];

  return (
    <section>
      <div className="mx-auto">
        <div className="mb-8 flex justify-end">
          <Tabs value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as "monthly" | "yearly")}>
            <TabsList className="flex w-full max-w-md text-sm gap-1 border">
              <TabsTrigger value="monthly" className="text-sm">Monthly</TabsTrigger>
              <TabsTrigger value="yearly" className="text-sm">Yearly (2 Months Free)</TabsTrigger>
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
                    <NumberFlow
                      value={pricingPlans.free.price}
                      format={{
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }}
                    />
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {pricingPlans.free.subtitle}
                  </span>
                  <Button asChild variant={pricingPlans.free.variant} size="sm">
                    <Link href="#">Get Started</Link>
                  </Button>
                </th>
                <th className="bg-muted space-y-2 rounded-t-(--radius) px-4">
                  <span className="block">{pricingPlans.pro.name}</span>
                  <span className="block text-2xl font-medium">
                    <NumberFlow
                      value={proPlan.price}
                      format={{
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }}
                    />
                  </span>
                  <span className="text-muted-foreground block text-sm">
                    {proPlan.subtitle}
                  </span>
                  {/* {"savings" in proPlan && proPlan.savings && (
                    <span className="text-muted-foreground block text-xs">
                      {proPlan.savings}
                    </span>
                  )} */}
                  <Button asChild variant={pricingPlans.pro.variant} size="sm">
                    <Link href="#">Get Started</Link>
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
              {tableData.map((row) => (
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
