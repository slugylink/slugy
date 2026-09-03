"use client";
import { plans, getPlanPriceSubtitle } from "@/constants/data/price";
import React, { useState } from "react";
import { createAuthClient } from "better-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

const { useSession } = createAuthClient();

const UpgardePage = () => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const { data: subData, isLoading: subLoading } = useSWR<{
    subscription?: {
      plan?: {
        name?: string;
      };
    };
  }>(session?.user ? "/api/subscription/active" : null, fetcher);
  const activePlanName = subData?.subscription?.plan?.name?.toLowerCase();

  const handleClick = (priceId: string) => {
    if (!session?.user) {
      alert("Please log in to continue");
      return;
    }

    const customerEmail = encodeURIComponent(session.user.email || "");
    const customerName = encodeURIComponent(session.user.name || "");
    const checkoutUrl = `/api/subscription/checkout?products=${encodeURIComponent(priceId)}&customer_email=${customerEmail}&customer_name=${customerName}`;

    window.location.href = checkoutUrl;
  };

  const handleManageSubscription = () => {
    if (!session?.user) {
      alert("Please log in to manage your subscription");
      return;
    }
    setLoading(true);
    window.location.href = "/api/subscription/manage";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">Choose Your Plan</h1>
        <p className="text-muted-foreground">
          Select the perfect plan for your needs
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:mx-auto lg:max-w-4xl">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              "flex flex-col gap-6 rounded-[18px] p-6 shadow-none md:p-8",
              plan.planType === "pro"
                ? "border-2 border-[#ffaa40] bg-zinc-50 dark:bg-black/50"
                : "bg-background dark:border-zinc-700",
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold capitalize">{plan.name}</h3>
                {plan.planType === "pro" && (
                  <div className="rounded-full bg-[#ffaa40] p-1 px-2 text-xs font-medium text-black">
                    Recommended
                  </div>
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                {plan.description}
              </p>
            </div>

            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold">${plan.monthlyPrice}</div>
              <span className="text-muted-foreground text-sm">
                {getPlanPriceSubtitle(plan, "monthly")}
              </span>
            </div>

            <Button
              onClick={() => handleClick(plan.monthlyPriceId)}
              disabled={
                !session?.user || activePlanName === plan.planType || subLoading
              }
              variant={plan.monthlyPrice === 0 ? "outline" : "default"}
              className="w-full"
            >
              {activePlanName === plan.planType
                ? "Currently active"
                : session?.user
                  ? plan.buttonLabel
                  : "Please log in"}
            </Button>

            <ul className="grid gap-2 text-zinc-600 dark:text-zinc-300">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Button
        onClick={handleManageSubscription}
        disabled={!session?.user || loading}
        className="mt-8 w-fit"
      >
        {loading ? "Redirecting..." : "Manage Subscription"}
      </Button>
    </div>
  );
};

export default UpgardePage;
