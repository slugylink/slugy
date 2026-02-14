"use client";

import { plans } from "@/constants/data/price";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import NumberFlow from "@number-flow/react";

type BillingPeriod = "monthly" | "yearly";
type Plan = (typeof plans)[number];

interface PricingComparatorProps {
  workspace?: string;
  isPaidPlan?: boolean;
}

interface Feature {
  feature: string;
  freeValue: string | boolean | number;
  proValue: string | boolean | number;
}

const CURRENCY_FORMAT = {
  style: "currency" as const,
  currency: "USD",
  maximumFractionDigits: 0,
};

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
      freeValue: FREE_PLAN.maxWorkspaces,
      proValue: PRO_PLAN.maxWorkspaces,
    },
    {
      feature: "Links",
      freeValue: `${FREE_PLAN.maxLinksPerWorkspace} / workspace`,
      proValue: `${PRO_PLAN.maxLinksPerWorkspace} / workspace`,
    },
    {
      feature: "Analytics",
      freeValue: formatClicks(FREE_PLAN.maxClicksPerWorkspace),
      proValue: formatClicks(PRO_PLAN.maxClicksPerWorkspace),
    },
    {
      feature: "Analytics Retention",
      freeValue: FREE_PLAN.analyticsRetention,
      proValue: PRO_PLAN.analyticsRetention,
    },
    {
      feature: "Advanced Analytics",
      freeValue: false,
      proValue: true,
    },
    {
      feature: "Bio Links",
      freeValue: FREE_PLAN.maxBioLinks,
      proValue: PRO_PLAN.maxBioLinks,
    },
    {
      feature: "Link Tags",
      freeValue: FREE_PLAN.maxLinkTags,
      proValue: PRO_PLAN.maxLinkTags,
    },
    {
      feature: "Custom Domains",
      freeValue: FREE_PLAN.maxCustomDomains,
      proValue: PRO_PLAN.maxCustomDomains,
    },
    {
      feature: "Users",
      freeValue: FREE_PLAN.maxUsers,
      proValue: PRO_PLAN.maxUsers,
    },
    {
      feature: "UTM Templates",
      freeValue: FREE_PLAN.maxUTM,
      proValue: PRO_PLAN.maxUTM,
    },
    {
      feature: "Custom Link Preview",
      freeValue: FREE_PLAN.customizeLinkPreview,
      proValue: PRO_PLAN.customizeLinkPreview,
    },
    {
      feature: "Link Expiration",
      freeValue: FREE_PLAN.linkExp,
      proValue: PRO_PLAN.linkExp,
    },
    {
      feature: "Password Protection",
      freeValue: FREE_PLAN.linkPassword,
      proValue: PRO_PLAN.linkPassword,
    },
  ];
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

  return "https://app.slugy.co/login";
}

function getPrice(plan: Plan, billing: BillingPeriod): number {
  return billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
}

function getPriceSubtitle(plan: Plan, billing: BillingPeriod): string {
  if (plan.planType === "free") return "Forever free";
  return billing === "yearly" ? "/year" : "/month";
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
  const price = getPrice(plan, billing);
  const subtitle = getPriceSubtitle(plan, billing);
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
        <NumberFlow value={price} format={CURRENCY_FORMAT} />
      </span>
      <span className="text-muted-foreground block text-xs">{subtitle}</span>
      <Button asChild variant={buttonVariant} size="sm">
        <Link href={buttonUrl}>{buttonText}</Link>
      </Button>
    </th>
  );
}

function FeatureRow({ feature, freeValue, proValue }: Feature) {
  return (
    <tr className="*:border-b *:py-3">
      <td className="text-muted-foreground">{feature}</td>
      <td>
        <FeatureValue value={freeValue} />
      </td>
      <td className="bg-muted border-none px-4">
        <div className="-mb-3 border-b py-3">
          <FeatureValue value={proValue} />
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

  const features = useMemo(() => buildFeatures(), []);

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
          <table className="w-full border-separate border-spacing-x-3 dark:[--color-muted:var(--color-zinc-900)]">
            <thead className="bg-background sticky top-0">
              <tr className="*:py-4 *:text-left *:font-medium">
                <th className="lg:w-2/5" />
                <PriceHeader
                  plan={FREE_PLAN}
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
              {features.map((feature) => (
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
