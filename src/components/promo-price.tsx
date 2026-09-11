"use client";

import NumberFlow from "@number-flow/react";
import { PRICING_CURRENCY_FORMAT } from "@/constants/data/price";

export function PromoPrice({
  price,
  promoPrice,
  className,
}: {
  price: number;
  promoPrice: number | null;
  className?: string;
}) {
  if (promoPrice == null || promoPrice >= price) {
    return (
      <NumberFlow
        value={price}
        locales="en-US"
        format={PRICING_CURRENCY_FORMAT}
        className={className}
      />
    );
  }

  return (
    <span className="inline-flex items-baseline gap-2">
      <NumberFlow
        value={price}
        locales="en-US"
        format={PRICING_CURRENCY_FORMAT}
        className="text-muted-foreground text-lg font-normal line-through sm:text-xl"
      />
      <NumberFlow
        value={promoPrice}
        locales="en-US"
        format={PRICING_CURRENCY_FORMAT}
        className={className}
      />
    </span>
  );
}
