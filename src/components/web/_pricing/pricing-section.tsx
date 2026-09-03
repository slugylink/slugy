"use client";
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
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import NumberFlow from "@number-flow/react";
import {
  plans,
  PRICING_COPY,
  PRICING_CURRENCY_FORMAT,
  getPlanPrice,
  getPlanPriceSubtitle,
  type BillingPeriod,
  type Plan,
} from "@/constants/data/price";

export default function PricingSection() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

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

          <TabsContent value={billing}>
            <div className="mx-auto mt-8 grid w-full max-w-3xl grid-cols-1 gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6">
              {plans.map((plan: Plan) => {
                const {
                  name,
                  description,
                  isReady,
                  buttonLabel,
                  features,
                  yearlyDiscount,
                } = plan;
                const showMore = features.length > 9;
                const price = getPlanPrice(plan, billing);
                const priceSubtitle = getPlanPriceSubtitle(plan, billing);
                const isYearly = billing === "yearly";
                const isBasic = plan.planType === "basic";

                return (
                  <Card
                    key={name}
                    className="h-full w-full max-w-none rounded-3xl border bg-zinc-100/60 p-1.5 backdrop-blur-md dark:bg-zinc-900/60"
                  >
                    <CardHeader className="space-y-4 rounded-[18px] bg-white p-4 shadow-sm sm:p-5 [.border-b]:border-zinc-200/60 dark:[.border-b]:border-zinc-800">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-base sm:text-lg">
                            {name}
                          </CardTitle>
                          <CardDescription className="mt-1 text-sm text-zinc-700">
                            {description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="mb-1 flex items-end gap-2">
                        <NumberFlow
                          value={price}
                          locales="en-US"
                          format={PRICING_CURRENCY_FORMAT}
                          className="text-2xl font-medium tracking-tight sm:text-3xl"
                        />
                        <span className="mb-2 text-sm text-zinc-700">
                          {priceSubtitle}
                        </span>
                        {isYearly &&
                          !isBasic &&
                          typeof yearlyDiscount === "number" &&
                          yearlyDiscount > 0 && (
                            <Badge variant="secondary" className="mb-1">
                              Save {yearlyDiscount}%
                            </Badge>
                          )}
                      </div>
                      <Button
                        asChild
                        size="lg"
                        className="w-full rounded-lg"
                        disabled={!isReady}
                      >
                        <Link href={PRICING_COPY.loginUrl}>{buttonLabel}</Link>
                      </Button>
                    </CardHeader>

                    <CardContent className="px-4 pb-4">
                      <div className="border-zinc-200 text-sm dark:border-zinc-800">
                        <p className="mb-3 border-b pb-2.5 text-xs font-normal text-zinc-700 uppercase dark:text-zinc-200">
                          Includes
                        </p>
                        <ul className="space-y-2">
                          {features
                            .slice(0, 9)
                            .map((feat: string, idx: number) => (
                              <li
                                key={feat}
                                className="flex items-start gap-2 capitalize"
                              >
                                <IoIosCheckmarkCircle className="" size={19} />
                                <span>{feat}</span>
                                {showMore && idx === 8 && (
                                  <span className="text-muted-foreground ml-1 flex cursor-pointer items-center gap-1 lowercase underline">
                                    more <MoveUpRight size={12} />
                                  </span>
                                )}
                              </li>
                            ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </MaxWidthContainer>
    </section>
  );
}
