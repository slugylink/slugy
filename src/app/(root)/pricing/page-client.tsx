"use client";

import MaxWidthContainer from "@/components/max-width-container";
import PricingComparator from "@/components/pricing-comparator";

export default function PricingPageClient() {
  return (
    <section className="!mt-[165px] pb-14 sm:pb-20">
      <MaxWidthContainer>
        <div className="mb-20 text-center">
          <h1 className="text-2xl font-medium text-balance sm:text-4xl">
            Simple pricing for short links that track revenue
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm sm:text-base">
            Slugy is a URL shortener with click, lead, and revenue analytics.
            Free branded short links on every plan — Pro adds lead conversion
            tracking, Growth adds sales analytics. Upgrade anytime.
          </p>
        </div>

        <div className="mx-auto max-w-6xl">
          <PricingComparator />
        </div>
      </MaxWidthContainer>
    </section>
  );
}
