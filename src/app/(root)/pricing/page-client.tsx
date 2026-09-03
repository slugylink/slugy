"use client";

import MaxWidthContainer from "@/components/max-width-container";
import PricingComparator from "@/components/pricing-comparator";
import { PRICING_COPY } from "@/constants/data/price";

export default function PricingPageClient() {
  return (
    <section className="!mt-[165px] pb-14 sm:pb-20">
      <MaxWidthContainer>
        <div className="mb-20 text-center">
          <h1 className="text-2xl font-medium text-balance sm:text-4xl">
            Flexible Pricing for Everyone
          </h1>
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

        <div className="mx-auto max-w-6xl">
          <PricingComparator />
        </div>
      </MaxWidthContainer>
    </section>
  );
}
