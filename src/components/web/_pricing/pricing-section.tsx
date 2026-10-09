"use client";
import MaxWidthContainer from "@/components/max-width-container";
import { useState } from "react";
import {
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/web/_motion/scroll-reveal";
import { Button } from "@/components/ui/button";
import SignupLink from "@/components/web/signup-link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  plans,
  PRICING_COPY,
  PRICING_CURRENCY_FORMAT,
  getPlanPrice,
  getPlanPriceSubtitle,
  isPlanComingSoon,
  getPlanCtaLabel,
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
  const subtitle = getPlanPriceSubtitle(plan, billing);
  const per =
    subtitle === "Forever" ? "free forever" : `per ${subtitle.slice(1)}`;
  return (
    <p className="text-lg">
      <span className="font-semibold">
        {new Intl.NumberFormat("en-US", PRICING_CURRENCY_FORMAT).format(price)}
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
        {isPlanComingSoon(plan) ? (
          <Button size="lg" variant="outline" className="mt-4 w-full" disabled>
            {getPlanCtaLabel(plan)}
          </Button>
        ) : (
          <Button
            asChild
            size="lg"
            variant={bestValue ? "default" : "outline"}
            className={
              bestValue
                ? "mt-4 w-full"
                : "mt-4 w-full bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            }
          >
            <SignupLink>{getPlanCtaLabel(plan)}</SignupLink>
          </Button>
        )}
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
  const [free, pro, growth, premium] = plans;
  const proFeatures = new Set(pro?.features ?? []);
  const growthExtras = (growth?.features ?? []).filter(
    (f) => !proFeatures.has(f),
  );

  const growthFeatures = new Set(growth?.features ?? []);
  const premiumExtras = (premium?.features ?? []).filter(
    (f) => !growthFeatures.has(f),
  );

  return (
    <section className="py-10 sm:py-16">
      <MaxWidthContainer>
        <Reveal className="mb-6 text-center sm:mb-8">
          <h2 className="text-2xl font-medium text-balance sm:text-4xl">
            Flexible Pricing for Everyone
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm sm:text-base">
            Pick a plan that fits your needs. Upgrade anytime.
          </p>
        </Reveal>

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

          <Stagger
            className="mx-auto mt-8 grid w-full max-w-6xl grid-cols-1 gap-8 sm:mt-10 md:grid-cols-2 md:gap-5 lg:grid-cols-4"
            stagger={0.12}
          >
            {free && (
              <StaggerItem>
                <PlanCard plan={free} billing={billing} />
              </StaggerItem>
            )}
            {pro && (
              <StaggerItem>
                <PlanCard
                  plan={pro}
                  billing={billing}
                  bestValue={pro.isRecommended}
                />
              </StaggerItem>
            )}
            {growth && (
              <StaggerItem>
                <PlanCard
                  plan={growth}
                  billing={billing}
                  bestValue={growth.isRecommended}
                  plusHeader="Everything in Pro, plus:"
                  plusFeatures={
                    growthExtras.length > 0 ? growthExtras : undefined
                  }
                />
              </StaggerItem>
            )}
            {premium && (
              <StaggerItem>
                <PlanCard
                  plan={premium}
                  billing={billing}
                  bestValue={premium.isRecommended}
                  plusHeader="Everything in Growth, plus:"
                  plusFeatures={premiumExtras}
                />
              </StaggerItem>
            )}
          </Stagger>
        </Tabs>
      </MaxWidthContainer>
    </section>
  );
}
