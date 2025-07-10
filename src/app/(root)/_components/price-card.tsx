import React from "react";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/web/animated-number";
import SubscribeButton from "@/components/web/subscribe-button";
import Link from "next/link";

interface PricingCardProps {
  id: string;
  title: string;
  price: number | string;
  description: string;
  features: string[];
  isRecommended: boolean;
  buttonLabel: string;
  borderColor?: string;
  isReady?: boolean;
  billingCycle: "monthly" | "yearly";
  yearlyDiscount: number;
  priceId?: string;
}

export function PricingCard({
  id,
  title,
  price,
  description,
  features,
  isRecommended,
  buttonLabel,
  borderColor,
  isReady,
  billingCycle,
  yearlyDiscount,
  priceId,
}: PricingCardProps) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-6 rounded-2xl p-6 shadow-none md:p-8",
        borderColor ? `border-2 ${borderColor}` : "",
        isRecommended
          ? "border-2 border-[#ffaa40] bg-zinc-50 dark:bg-black/50"
          : "bg-background dark:border-zinc-700",
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          {isRecommended && (
            <div className="rounded-full bg-[#ffaa40] p-1 px-2 text-xs font-medium text-black">
              Recommended
            </div>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-4xl font-bold">
          $<AnimatedNumber value={+price} />
        </div>
        <span className="text-muted-foreground text-sm">
          /{billingCycle === "monthly" ? "month" : "year"}
        </span>
        {billingCycle === "yearly" && yearlyDiscount > 0 && (
          <span className="ml-2 text-sm font-medium text-green-600">
            Save {yearlyDiscount}%
          </span>
        )}
      </div>
      <Link href={"https://app.slugy.co"}>
        {/* <Button
          disabled={!isReady}
          variant={+price === 0 ? "outline" : "default"}
          className="w-full"
        >
          {buttonLabel}
        </Button> */}
        <SubscribeButton
          isReady={isReady!}
          price={+price}
          buttonLabel={buttonLabel}
          priceId={priceId!}
          planId={id}
          isUpgrade={true}
        />
      </Link>
      <ul className="grid gap-2 text-zinc-600 dark:text-zinc-300">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>
    </Card>
  );
}
