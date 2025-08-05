"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import Hero from "./_components/hero";
import { LoaderCircle } from "@/utils/icons/loader-circle";

const LOADING_HEIGHT = {
  features: "h-[400px]",
  stats: "h-[300px]",
  pricing: "h-[500px]",
  openSource: "h-[300px]",
};

function LoadingSection({ height = "h-[200px]" }: { height?: string }) {
  return (
    <div className={`flex w-full items-center justify-center ${height}`}>
      <LoadingSpinner />
    </div>
  );
}

const LoadingSpinner = () => (
  <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
);

const Features = dynamic(() => import("./_components/feature"), {
  loading: () => <LoadingSection height={LOADING_HEIGHT.features} />,
  ssr: true,
});

const Stats = dynamic(() => import("./_components/stats"), {
  loading: () => <LoadingSection height={LOADING_HEIGHT.stats} />,
  ssr: true,
});

// const Pricing = dynamic(() => import("./_components/pricing"), {
//   loading: () => <LoadingSection height={LOADING_HEIGHT.pricing} />,
//   ssr: true,
// });

const OpenSource = dynamic(() => import("./_components/open-source"), {
  loading: () => <LoadingSection height={LOADING_HEIGHT.openSource} />,
  ssr: true,
});

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero section rendered immediately */}
      <div className="relative w-full">
        <div className="z-20 mx-auto max-w-6xl py-4">
          <Hero />
        </div>
      </div>

      <Suspense fallback={<LoadingSection height={LOADING_HEIGHT.features} />}>
        <section id="features" className="scroll-mt-20">
          <Features />
        </section>
      </Suspense>

      <Suspense fallback={<LoadingSection height={LOADING_HEIGHT.stats} />}>
        <section id="stats" className="scroll-mt-20">
          <Stats />
        </section>
      </Suspense>

      <Suspense
        fallback={<LoadingSection height={LOADING_HEIGHT.openSource} />}
      >
        <section id="open-source" className="scroll-mt-20">
          <OpenSource />
        </section>
      </Suspense>
    </main>
  );
}
