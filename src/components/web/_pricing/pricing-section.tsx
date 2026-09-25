"use client";
import MaxWidthContainer from "@/components/max-width-container";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PromoPrice } from "@/components/promo-price";
import {
  plans,
  PRICING_COPY,
  getPlanPrice,
  getPlanPromoPrice,
  getPlanPriceSubtitle,
  type BillingPeriod,
  type Plan,
} from "@/constants/data/price";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Clock,
  Eye,
  FlaskConical,
  Globe,
  LayoutGrid,
  Link as LinkIcon,
  Link2,
  Lock,
  MapPin,
  MousePointerClick,
  QrCode,
  Tag,
  Users,
  LifeBuoy,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const FEATURE_ICON_RULES: Array<{ match: RegExp; icon: LucideIcon }> = [
  { match: /click|event/i, icon: MousePointerClick },
  { match: /qr/i, icon: QrCode },
  { match: /retention|month|year/i, icon: CalendarDays },
  { match: /domain/i, icon: Globe },
  { match: /team|member|user/i, icon: Users },
  { match: /support/i, icon: LifeBuoy },
  { match: /tag/i, icon: Tag },
  { match: /bio/i, icon: LayoutGrid },
  { match: /password/i, icon: Lock },
  { match: /geo/i, icon: MapPin },
  { match: /expir/i, icon: Clock },
  { match: /preview/i, icon: Eye },
  { match: /utm/i, icon: FlaskConical },
  { match: /workspace/i, icon: Briefcase },
  { match: /analytic/i, icon: BarChart3 },
  { match: /link/i, icon: Link2 },
];

function featureIcon(feature: string): LucideIcon {
  return (
    FEATURE_ICON_RULES.find((rule) => rule.match.test(feature))?.icon ??
    Sparkles
  );
}

function PriceLine({ plan, billing }: { plan: Plan; billing: BillingPeriod }) {
  const price = getPlanPrice(plan, billing);
  const promoPrice = getPlanPromoPrice(plan, billing);
  const subtitle = getPlanPriceSubtitle(plan, billing);
  const per =
    subtitle === "Forever" ? "free forever" : `per ${subtitle.slice(1)}`;
  return (
    <p className="text-lg">
      <span className="font-semibold">
        <PromoPrice price={price} promoPrice={promoPrice} />
      </span>{" "}
      <span className="text-muted-foreground text-sm">{per}</span>
    </p>
  );
}

function PlanCard({
  plan,
  billing,
  bestValue,
  plusHeader,
  plusFeatures,
}: {
  plan: Plan;
  billing: BillingPeriod;
  bestValue?: boolean;
  plusHeader?: string;
  plusFeatures?: string[];
}) {
  const features = plusFeatures ?? plan.features;
  return (
    <div className="flex h-full flex-col">
      <div className="rounded-xl bg-zinc-100/80 p-5 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">{plan.name}</h3>
          {bestValue && (
            <Badge className="bg-orange-200 px-2 py-0 text-[10px] font-semibold tracking-wide text-orange-900 uppercase hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-200">
              Best value
            </Badge>
          )}
        </div>
        <div className="mt-1">
          <PriceLine plan={plan} billing={billing} />
        </div>
        <p className="text-muted-foreground mt-3 min-h-10 text-sm">
          {plan.description}
        </p>
        <Button
          asChild
          size="lg"
          variant={bestValue ? "default" : "outline"}
          className={
            bestValue
              ? "mt-4 w-full"
              : "mt-4 w-full bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          }
          disabled={!plan.isReady}
        >
          <Link href={PRICING_COPY.loginUrl}>{plan.buttonLabel}</Link>
        </Button>
      </div>

      <div className="px-1 pt-5">
        <p className="text-sm font-semibold">{plusHeader ?? "Key Features:"}</p>
        <ul className="mt-3 space-y-2.5">
          {features.map((feat) => {
            const Icon = featureIcon(feat);
            return (
              <li key={feat} className="flex items-start gap-2.5 text-sm">
                <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <span>{feat}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function PricingSection() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [free, pro, business] = plans;
  const proFeatures = new Set(pro?.features ?? []);
  const businessExtras = (business?.features ?? []).filter(
    (f) => !proFeatures.has(f),
  );

  return (
    <section className="mt-12 py-8 sm:py-10">
      <MaxWidthContainer>
        <div className="mb-6 text-center sm:mb-8">
          <h2 className="text-2xl font-medium text-balance sm:text-4xl">
            Flexible Pricing for Everyone
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm sm:text-base">
            Pick a plan that fits your needs. Upgrade anytime.
          </p>
          <p className="text-primary mx-auto mt-3 max-w-2xl text-sm font-medium">
            {PRICING_COPY.promoPrefix}{" "}
            <span className="rounded bg-red-500/10 px-2 py-1">
              {PRICING_COPY.promoCode}
            </span>{" "}
            {PRICING_COPY.promoSuffix}
          </p>
        </div>

        {/* Tabs for monthly & yearly */}
        <Tabs
          value={billing}
          onValueChange={(v) => setBilling(v as BillingPeriod)}
          className="w-full"
        >
          <div className="flex w-full items-center justify-center pt-3">
            <TabsList className="relative mt-2 h-auto overflow-visible">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly" className="relative overflow-visible">
                Yearly
                <Badge className="absolute -top-4 left-[50%] z-10 -translate-x-1/2 bg-blue-500 px-1.5 py-0 text-[10px] leading-4">
                  {PRICING_COPY.yearlySavings}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="mx-auto mt-8 grid w-full max-w-5xl grid-cols-1 gap-8 sm:mt-10 md:grid-cols-3 md:gap-5">
            {free && <PlanCard plan={free} billing={billing} />}
            {pro && <PlanCard plan={pro} billing={billing} bestValue />}
            {business && (
              <PlanCard
                plan={business}
                billing={billing}
                plusHeader="Everything in Pro, plus:"
                plusFeatures={
                  businessExtras.length > 0 ? businessExtras : undefined
                }
              />
            )}
          </div>
        </Tabs>
      </MaxWidthContainer>
    </section>
  );
}
