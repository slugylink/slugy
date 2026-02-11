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
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import NumberFlow from "@number-flow/react";

type Plan = (typeof plans)[number];

export default function PricingSection() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <section className="pb-14 sm:pb-20">
      <MaxWidthContainer>
        <div className="mb-20 text-center">
          <h2 className="text-2xl font-medium text-balance sm:text-4xl">
            Flexible Pricing for Everyone
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm sm:text-base">
            Pick a plan that fits your needs. Upgrade anytime.
          </p>
        </div>

        {/* Tabs for monthly & yearly */}
        <Tabs
          value={billing}
          onValueChange={(v) => setBilling(v as "monthly" | "yearly")}
          className="w-full"
        >
          <div className="flex w-full items-center justify-center">
            <TabsList className="mt-2">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={billing}>
            <div className="mx-auto mt-10 flex w-full flex-col items-start justify-center gap-8 sm:flex-row">
              {plans.map((plan: Plan) => {
                const {
                  name,
                  description,
                  monthlyPrice,
                  yearlyPrice,
                  isReady,
                  buttonLabel,
                  features,
                  yearlyDiscount,
                } = plan;
                const showMore = features.length > 9;
                const isYearly = billing === "yearly";
                const price = isYearly ? yearlyPrice : monthlyPrice;

                return (
                  <Card
                    key={name}
                    className="w-full max-w-[370px] rounded-3xl border bg-zinc-100/90 p-1.5 backdrop-blur-md dark:bg-zinc-900/60"
                  >
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
                          format={{
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          }}
                          className="text-3xl font-medium tracking-tight"
                        />
                        <span className="mb-2 text-sm text-zinc-700">
                          {price === 0
                            ? "[Free forever]"
                            : isYearly
                              ? "/ year"
                              : "/ month"}
                        </span>
                        {isYearly &&
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
                        <Link href="https://app.slugy.co/login">
                          {buttonLabel}
                        </Link>
                      </Button>
                    </CardHeader>

                    <CardContent className="pb-5">
                      <div className="border-zinc-200 px-2 text-sm dark:border-zinc-800">
                        <p className="mb-3 border-b pb-2.5 font-normal text-zinc-700 uppercase dark:text-zinc-200">
                          Includes:{" "}
                          {name !== "Free" && (
                            <span className="normal-case">
                              (Everything in free, plus)
                            </span>
                          )}
                        </p>
                        <ul className="space-y-2">
                          {features
                            .slice(0, 9)
                            .map((feat: string, idx: number) => (
                              <li
                                key={feat}
                                className="flex items-start gap-2 capitalize"
                              >
                                <IoIosCheckmarkCircle size={19} />
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
