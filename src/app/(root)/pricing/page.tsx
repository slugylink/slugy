"use client";

import { plans } from "@/constants/data/price";
import MaxWidthContainer from "@/components/max-width-container";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IoIosCheckmarkCircle } from "react-icons/io";
import { MoveUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import NumberFlow from "@number-flow/react";
import PricingComparator from "@/components/pricing-comparator";

type Plan = (typeof plans)[number];
type BillingPeriod = "monthly" | "yearly";

const MAX_VISIBLE_FEATURES = 9;
const APP_URL = "https://app.slugy.co";

const CURRENCY_FORMAT = {
  style: "currency" as const,
  currency: "USD",
  maximumFractionDigits: 0,
};

// Get price based on billing period
function getPrice(plan: Plan, billing: BillingPeriod): number {
  return billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
}

// Get price period label
function getPricePeriodLabel(price: number, isYearly: boolean): string {
  if (price === 0) return "[Free forever]";
  return isYearly ? "/ year" : "/ month";
}

// Feature list item component
function FeatureItem({
  feature,
  showMoreLink,
}: {
  feature: string;
  showMoreLink?: boolean;
}) {
  return (
    <li className="flex items-start gap-2 capitalize">
      <IoIosCheckmarkCircle size={19} />
      <span>{feature}</span>
      {showMoreLink && (
        <span className="text-muted-foreground ml-1 flex cursor-pointer items-center gap-1 lowercase underline">
          more <MoveUpRight size={12} />
        </span>
      )}
    </li>
  );
}

// Pricing card component for landing page (simplified version)
function PricingCard({
  plan,
  billing,
}: {
  plan: Plan;
  billing: BillingPeriod;
}) {
  const { name, description, isReady, buttonLabel, features, yearlyDiscount } =
    plan;

  const isYearly = billing === "yearly";
  const price = getPrice(plan, billing);
  const hasMoreFeatures = features.length > MAX_VISIBLE_FEATURES;
  const visibleFeatures = features.slice(0, MAX_VISIBLE_FEATURES);
  const showDiscount =
    isYearly && typeof yearlyDiscount === "number" && yearlyDiscount > 0;

  return (
    <Card className="w-full max-w-[370px] rounded-3xl border bg-zinc-100/90 p-1.5 backdrop-blur-md dark:bg-zinc-900/60">
      <CardHeader className="space-y-4 rounded-[18px] bg-white p-6 shadow-md [.border-b]:border-zinc-200/60 dark:[.border-b]:border-zinc-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{name}</CardTitle>
            <CardDescription className="mt-1 text-zinc-700">
              {description}
            </CardDescription>
          </div>
        </div>

        <div className="mb-3 flex items-end gap-2">
          <NumberFlow
            value={price}
            format={CURRENCY_FORMAT}
            className="text-3xl font-medium tracking-tight"
          />
          <span className="mb-2 text-sm text-zinc-700">
            {getPricePeriodLabel(price, isYearly)}
          </span>
          {showDiscount && (
            <Badge variant="secondary" className="mb-1">
              Save {yearlyDiscount}%
            </Badge>
          )}
        </div>

        <Button
          size="lg"
          className="w-full rounded-lg"
          disabled={!isReady}
          onClick={() => window.location.assign(APP_URL)}
        >
          {buttonLabel}
        </Button>
      </CardHeader>

      <CardContent className="pb-5">
        <div className="border-zinc-200 px-2 text-sm dark:border-zinc-800">
          <p className="mb-3 border-b pb-2.5 font-normal text-zinc-700 uppercase dark:text-zinc-200">
            Includes:{" "}
            {name !== "Free" && (
              <span className="normal-case">(Everything in free, plus)</span>
            )}
          </p>
          <ul className="space-y-2">
            {visibleFeatures.map((feature, idx) => (
              <FeatureItem
                key={feature}
                feature={feature}
                showMoreLink={
                  hasMoreFeatures && idx === MAX_VISIBLE_FEATURES - 1
                }
              />
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PricingSection() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  return (
    <section className="mt-20 pb-14 sm:pb-20">
      <MaxWidthContainer>
        <div className="mb-20 text-center">
          <h2 className="text-2xl font-medium text-balance sm:text-4xl">
            Flexible Pricing for Everyone
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm sm:text-base">
            Pick a plan that fits your needs. Upgrade anytime.
          </p>
        </div>

        {/* Use PricingComparator instead of individual cards */}
        <div className="mx-auto max-w-6xl">
          <PricingComparator />
        </div>
      </MaxWidthContainer>
    </section>
  );
}
