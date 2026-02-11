"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import Sponsors from "./_components/sponsors";

const LOADING_HEIGHT = {
  features: "h-[400px]",
  stats: "h-[300px]",
  pricing: "h-[500px]",
  openSource: "h-[300px]",
} as const;

// Loading spinner component
const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
  );
});

// Generic loading section
const LoadingSection = memo(function LoadingSection({
  height = "h-[200px]",
}: {
  height?: string;
}) {
  return (
    <div className={`flex w-full items-center justify-center ${height}`}>
      <LoadingSpinner />
    </div>
  );
});

// Hero section skeleton loader
const HeroSkeleton = memo(function HeroSkeleton() {
  return (
    <section className="mx-auto max-w-6xl overflow-x-hidden px-4">
      {/* Announcement Banner Skeleton */}
      <div className="z-10 mb-6 flex items-center justify-center sm:mb-8 md:mb-12">
        <div className="bg-muted/50 h-8 w-48 animate-pulse rounded-full" />
      </div>

      {/* Heading Skeleton */}
      <div className="space-y-2 text-center">
        <div className="bg-muted/50 mx-auto h-12 w-64 animate-pulse rounded sm:h-16 sm:w-80 md:h-20 md:w-96" />
        <div className="bg-muted/50 mx-auto h-12 w-56 animate-pulse rounded sm:h-16 sm:w-72 md:h-20 md:w-80" />
      </div>

      {/* Subheading Skeleton */}
      <div className="mx-auto mt-6 max-w-2xl">
        <div className="bg-muted/50 h-4 w-full animate-pulse rounded sm:h-5" />
        <div className="bg-muted/50 mx-auto mt-2 h-4 w-3/4 animate-pulse rounded sm:h-5" />
      </div>

      {/* Form Skeleton */}
      <div className="mt-8 flex justify-center">
        <div className="bg-muted/50 h-32 w-full max-w-md animate-pulse rounded-lg" />
      </div>
    </section>
  );
});

// Dynamic imports with loading states
const Hero = dynamic(() => import("./_components/hero"), {
  loading: () => <HeroSkeleton />,
  ssr: true,
});

const Features = dynamic(() => import("./_components/feature"), {
  loading: () => <LoadingSection height={LOADING_HEIGHT.features} />,
  ssr: true,
});

const PricingSection = dynamic(
  () => import("@/components/web/_pricing/pricing-section"),
  {
    loading: () => <LoadingSection height={LOADING_HEIGHT.pricing} />,
    ssr: true,
  },
);

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
    <main className="min-h-screen overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative mx-auto w-[99%] rounded-3xl border bg-gradient-to-br from-[#e8eaf7]/70 via-[#f6efe2]/60 to-[#f7f2ef]/70 py-8 pb-16">
        <div className="z-20 mx-auto max-w-6xl py-4">
          <Hero />
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="mt-12 scroll-mt-20">
        <Features />
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="scroll-mt-20">
        <PricingSection />
      </section>

      {/* Stats Section */}
      <section id="stats" className="scroll-mt-20">
        <Stats />
      </section>

      {/* Sponsors Section */}
      <section id="sponsors" className="scroll-mt-20">
        <Sponsors />
      </section>

      {/* Open Source Section */}
      <section id="open-source" className="scroll-mt-20">
        <OpenSource />
      </section>
    </main>
  );
}
