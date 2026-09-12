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
  const hasPromo = promoPrice != null && promoPrice < price;
  const displayPrice = hasPromo ? promoPrice : price;

  return (
    <span className="inline-flex items-baseline gap-2">
      {hasPromo && (
        <span className="text-muted-foreground text-lg font-normal line-through sm:text-xl">
          {new Intl.NumberFormat("en-US", PRICING_CURRENCY_FORMAT).format(
            price,
          )}
        </span>
      )}
      <NumberFlow
        value={displayPrice}
        locales="en-US"
        format={PRICING_CURRENCY_FORMAT}
        className={className}
      />
    </span>
  );
}
