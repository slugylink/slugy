import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Hero from "./_components/hero";
import { MotionProvider } from "./_components/reveal";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

const LOADING_HEIGHT = {
  features: "h-[400px]",
  stats: "h-[300px]",
  pricing: "h-[500px]",
  testimonials: "h-[380px]",
  openSource: "h-[300px]",
  sponsors: "h-[280px]",
  faq: "h-[420px]",
  finalCta: "h-[380px]",
  compare: "h-[480px]",
} as const;

function SectionPlaceholder({ height }: { height: string }) {
  return <div className={`${height} w-full`} aria-hidden />;
}

// Below-the-fold: defer JS; reserved height avoids layout jump
const Features = dynamic(() => import("./_components/feature"), {
  loading: () => <SectionPlaceholder height={LOADING_HEIGHT.features} />,
});

const PricingSection = dynamic(
  () => import("@/components/web/_pricing/pricing-section"),
  {
    loading: () => <SectionPlaceholder height={LOADING_HEIGHT.pricing} />,
  },
);

const Testimonials = dynamic(() => import("./_components/testimonials"), {
  loading: () => <SectionPlaceholder height={LOADING_HEIGHT.testimonials} />,
});

const Stats = dynamic(() => import("./_components/stats"), {
  loading: () => <SectionPlaceholder height={LOADING_HEIGHT.stats} />,
});

const Sponsors = dynamic(() => import("./_components/sponsors"), {
  loading: () => <SectionPlaceholder height={LOADING_HEIGHT.sponsors} />,
});

const Faq = dynamic(() => import("./_components/faq"), {
  loading: () => <SectionPlaceholder height={LOADING_HEIGHT.faq} />,
});

const FinalCta = dynamic(() => import("./_components/final-cta"), {
  loading: () => <SectionPlaceholder height={LOADING_HEIGHT.finalCta} />,
});

export default function Home() {
  return (
    <main className="mt-[65px] min-h-screen overflow-x-hidden">
      <div className="landing-hero-shell relative mx-auto w-[99%] overflow-hidden rounded-3xl border py-10 pb-20 sm:py-14 sm:pb-24">
        <div className="landing-hero-axes pointer-events-none absolute inset-0" />
        <div className="relative z-20 mx-auto max-w-6xl py-4">
          <Hero />
        </div>
      </div>

      <div>
        <MotionProvider>
          <section id="features" className="scroll-mt-20">
            <Features />
          </section>

          <section id="pricing" className="scroll-mt-20">
            <PricingSection />
          </section>
          <section id="testimonials" className="scroll-mt-20">
            <Testimonials />
          </section>

          <section id="stats-metrics" className="scroll-mt-20">
            <Stats />
          </section>

          <section id="sponsors" className="scroll-mt-20">
            <Sponsors />
          </section>

          <section id="faq" className="scroll-mt-20">
            <Faq />
          </section>

          <section id="get-started" className="scroll-mt-20">
            <FinalCta />
          </section>
        </MotionProvider>
      </div>
    </main>
  );
}
