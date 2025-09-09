"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import Hero from "./_components/hero";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import PricingSection from "@/components/web/_pricing/pricing-section";

// Constants moved outside component for better performance
const LOADING_HEIGHT = {
  features: "h-[400px]",
  stats: "h-[300px]",
  pricing: "h-[500px]",
  openSource: "h-[300px]",
} as const;

// Memoized loading components for better performance
const LoadingSpinner = memo(() => (
  <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
));
LoadingSpinner.displayName = "LoadingSpinner";

const LoadingSection = memo(function LoadingSection({
  height = "h-[200px]"
}: {
  height?: string;
}) {
  return (
    <div className={`flex w-full items-center justify-center ${height}`}>
      <LoadingSpinner />
    </div>
  );
});
LoadingSection.displayName = "LoadingSection";

const Features = dynamic(() => import("./_components/feature"), {
  loading: () => <LoadingSection height={LOADING_HEIGHT.features} />,
  ssr: true,
});

const Stats = dynamic(() => import("./_components/stats"), {
  loading: () => <LoadingSection height={LOADING_HEIGHT.stats} />,
  ssr: true,
});

const OpenSource = dynamic(() => import("./_components/open-source"), {
  loading: () => <LoadingSection height={LOADING_HEIGHT.openSource} />,
  ssr: true,
});

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero section rendered immediately */}
      <div className="relative mx-auto w-[99%] rounded-3xl border bg-gradient-to-br from-[#e8eaf7]/70 via-[#f6efe2]/60 to-[#f7f2ef]/70 py-8 pb-16">
        <div className="z-20 mx-auto max-w-6xl py-4">
          <Hero />
        </div>
      </div>

      <section id="features" className="mt-12 scroll-mt-20">
        <Features />
      </section>

      <section id="stats" className="scroll-mt-20">
        <PricingSection />
      </section>

      <section id="stats" className="scroll-mt-20">
        <Stats />
      </section>

      <section id="open-source" className="scroll-mt-20">
        <OpenSource />
      </section>
    </main>
  );
}
