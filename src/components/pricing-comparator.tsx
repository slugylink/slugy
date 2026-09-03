"use client";

import {
  BASIC_PLAN,
  PRO_PLAN,
  PRICING_COMPARISON_FEATURES,
  PRICING_COPY,
  PRICING_CURRENCY_FORMAT,
  getPlanPrice,
  getPlanPriceSubtitle,
  type BillingPeriod,
  type Plan,
  type PricingComparisonRow,
} from "@/constants/data/price";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import NumberFlow from "@number-flow/react";

interface PricingComparatorProps {
  workspace?: string;
  isPaidPlan?: boolean;
}

const MANAGE_BASE_URL = "/api/subscription/manage";

function buildButtonUrl(
  planType: Plan["planType"],
  isPaidPlan: boolean | undefined,
  workspace: string | undefined,
): string {
  if (planType === "pro" && isPaidPlan && workspace) {
    return `${MANAGE_BASE_URL}?returnUrl=${encodeURIComponent(`/${workspace}/settings/billing`)}`;
  }

  if (workspace) {
    return `/${workspace}/settings/billing/upgrade`;
  }

  return PRICING_COPY.loginUrl;
}

function FeatureValue({ value }: { value: string | boolean | number }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="size-4" />
    ) : (
      <span className="text-muted-foreground">-</span>
    );
  }
  return <>{value}</>;
}

function PriceHeader({
  plan,
  billing,
  workspace,
  isPaidPlan,
  highlighted = false,
}: {
  plan: Plan;
  billing: BillingPeriod;
  workspace?: string;
  isPaidPlan?: boolean;
  highlighted?: boolean;
}) {
  const price = getPlanPrice(plan, billing);
  const subtitle = getPlanPriceSubtitle(plan, billing);
  const shouldManage = plan.planType === "pro" && Boolean(isPaidPlan);
  const buttonText = shouldManage ? "Manage" : plan.buttonLabel;
  const buttonVariant = shouldManage
    ? "outline"
    : plan.planType === "pro"
      ? "default"
      : "outline";
  const buttonUrl = buildButtonUrl(plan.planType, isPaidPlan, workspace);

  const headerClass = highlighted
    ? "bg-muted space-y-2 rounded-t-(--radius) px-4"
    : "space-y-3";

  return (
    <th className={headerClass}>
      <span className="block">{plan.name}</span>
      <span className="block text-2xl font-medium">
        <NumberFlow
          value={price}
          locales="en-US"
          format={PRICING_CURRENCY_FORMAT}
        />
      </span>
      <span className="text-muted-foreground block text-xs">{subtitle}</span>
      <Button asChild variant={buttonVariant} size="sm">
        <Link href={buttonUrl}>{buttonText}</Link>
      </Button>
    </th>
  );
}

function FeatureRow({ feature, basic, pro }: PricingComparisonRow) {
  return (
    <tr className="*:border-b *:py-3">
      <td className="text-muted-foreground">{feature}</td>
      <td>
        <FeatureValue value={basic} />
      </td>
      <td className="bg-muted border-none px-4">
        <div className="-mb-3 border-b py-3">
          <FeatureValue value={pro} />
        </div>
      </td>
    </tr>
  );
}

export default function PricingComparator({
  workspace,
  isPaidPlan,
}: PricingComparatorProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  return (
    <section>
      <div className="mx-auto">
        <div className="mb-8 flex justify-center pt-3">
          <Tabs
            value={billingPeriod}
            onValueChange={(value) => setBillingPeriod(value as BillingPeriod)}
          >
            <TabsList className="relative flex w-full max-w-md gap-1 overflow-visible border text-sm">
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

        <div className="w-full overflow-auto lg:overflow-visible">
          <table className="w-full border-separate border-spacing-x-3 dark:[--color-muted:var(--color-zinc-900)]">
            <thead className="bg-background sticky top-0">
              <tr className="*:py-4 *:text-left *:font-medium">
                <th className="lg:w-2/5" />
                <PriceHeader
                  plan={BASIC_PLAN}
                  billing={billingPeriod}
                  workspace={workspace}
                  isPaidPlan={isPaidPlan}
                />
                <PriceHeader
                  plan={PRO_PLAN}
                  billing={billingPeriod}
                  workspace={workspace}
                  isPaidPlan={isPaidPlan}
                  highlighted
                />
              </tr>
            </thead>

            <tbody className="text-caption text-sm">
              <tr className="*:py-3">
                <td className="font-medium">Features</td>
                <td />
                <td className="bg-muted border-none px-4" />
              </tr>
              {PRICING_COMPARISON_FEATURES.map((feature) => (
                <FeatureRow key={feature.feature} {...feature} />
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
