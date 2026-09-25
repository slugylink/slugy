"use client";

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
import Link from "next/link";
import { Check } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { PromoPrice } from "@/components/promo-price";

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
  if (
    (planType === "pro" || planType === "business") &&
    isPaidPlan &&
    workspace
  ) {
    return `${MANAGE_BASE_URL}?returnUrl=${encodeURIComponent(`/${workspace}/settings/billing`)}`;
  }

  if (workspace) {
    return `/${workspace}/settings/billing/upgrade`;
  }

  return PRICING_COPY.loginUrl;
}

function formatClicks(clicks: number): string {
  if (clicks < 1000) return `${clicks} clicks`;
  const value = clicks / 1000;
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}k clicks`;
}

interface CompareRow {
  feature: string;
  get: (plan: Plan) => PricingFeatureValue;
}

const COMPARE_ROWS: CompareRow[] = [
  { feature: "Workspaces", get: (p) => p.maxWorkspaces },
  {
    feature: "Links",
    get: (p) => `${p.maxLinksPerWorkspace} new / month`,
  },
  {
    feature: "Tracked clicks",
    get: (p) => formatClicks(p.maxClicksPerWorkspace),
  },
  { feature: "Analytics Retention", get: (p) => p.analyticsRetention },
  {
    feature: "Bio Links",
    get: (p) => `${p.maxBioLinks} / gallery`,
  },
  { feature: "Link Tags", get: (p) => p.maxLinkTags },
  { feature: "Custom Domains", get: (p) => p.maxCustomDomains },
  { feature: "Team members", get: (p) => p.maxUsers },
  { feature: "UTM Templates", get: (p) => p.maxUTM },
  { feature: "Custom Link Preview", get: (p) => p.customizeLinkPreview },
  { feature: "Link Expiration", get: (p) => p.linkExp },
  { feature: "Password Protection", get: (p) => p.linkPassword },
  { feature: "Geo Targeting", get: (p) => p.linkGeoTargeting },
];

function FeatureValue({ value }: { value: PricingFeatureValue }) {
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
  const promoPrice = getPlanPromoPrice(plan, billing);
  const subtitle = getPlanPriceSubtitle(plan, billing);
  const paid = plan.planType === "pro" || plan.planType === "business";
  const shouldManage = paid && Boolean(isPaidPlan);
  const buttonText = shouldManage ? "Manage" : plan.buttonLabel;
  const buttonVariant = shouldManage || !highlighted ? "outline" : "default";
  const buttonUrl = buildButtonUrl(plan.planType, isPaidPlan, workspace);

  const headerClass = highlighted
    ? "bg-muted space-y-2 rounded-t-(--radius) px-4"
    : "space-y-3";

  return (
    <th className={headerClass}>
      <span className="block">
        {plan.name}
        {highlighted && (
          <Badge className="ml-2 bg-orange-200 px-2 py-0 text-[10px] font-semibold tracking-wide text-orange-900 uppercase hover:bg-orange-200">
            Best value
          </Badge>
        )}
      </span>
      <span className="block text-2xl font-medium">
        <PromoPrice price={price} promoPrice={promoPrice} />
      </span>
      <span className="text-muted-foreground block text-xs">{subtitle}</span>
      <Button asChild variant={buttonVariant} size="sm">
        <Link href={buttonUrl}>{buttonText}</Link>
      </Button>
    </th>
  );
}

function FeatureRow({
  feature,
  values,
  highlightIndex,
}: {
  feature: string;
  values: PricingFeatureValue[];
  highlightIndex: number;
}) {
  return (
    <tr className="*:border-b *:py-3">
      <td className="text-muted-foreground">{feature}</td>
      {values.map((value, i) =>
        i === highlightIndex ? (
          <td key={i} className="bg-muted border-none px-4">
            <div className="-mb-3 border-b py-3">
              <FeatureValue value={value} />
            </div>
          </td>
        ) : (
          <td key={i}>
            <FeatureValue value={value} />
          </td>
        ),
      )}
    </tr>
  );
}

export default function PricingComparator({
  workspace,
  isPaidPlan,
}: PricingComparatorProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const highlightIndex = Math.max(
    0,
    plans.findIndex((p) => p.isRecommended),
  );

  return (
    <section>
      <div className="mx-auto">
        <p className="text-primary mb-4 text-center text-sm font-medium">
          {PRICING_COPY.promoPrefix}{" "}
          <span className="rounded bg-red-500/10 px-2 py-1">
            {PRICING_COPY.promoCode}
          </span>{" "}
          {PRICING_COPY.promoSuffix}
        </p>
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
                <th className="lg:w-1/4" />
                {plans.map((plan, i) => (
                  <PriceHeader
                    key={plan.planType}
                    plan={plan}
                    billing={billingPeriod}
                    workspace={workspace}
                    isPaidPlan={isPaidPlan}
                    highlighted={i === highlightIndex}
                  />
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
              {COMPARE_ROWS.map((row) => (
                <FeatureRow
                  key={row.feature}
                  feature={row.feature}
                  values={plans.map((plan) => row.get(plan))}
                  highlightIndex={highlightIndex}
                />
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
