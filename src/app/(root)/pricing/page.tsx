"use client";

import { plans } from "@/constants/data/price";
import MaxWidthContainer from "@/components/max-width-container";
import PricingComparator from "@/components/pricing-comparator";
export default function PricingSection() {
  return (
    <section className="mt-20 pb-14 sm:pb-20">
      <MaxWidthContainer>
        <div className="mb-20 text-center">
          <h2 className="text-2xl font-medium text-balance sm:text-4xl">
            Flexible Pricing for Everyone
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm sm:text-base">
            Pick a plan that fits your needs. Upgrade anytime.
          </p>
        </div>

        {/* Use PricingComparator instead of individual cards */}
        <div className="mx-auto max-w-6xl">
          <PricingComparator />
        </div>
      </MaxWidthContainer>
    </section>
  );
}
