import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Hero from "./_components/hero";
import ToolsSection from "./_components/tools-section";
import Differentiator from "./_components/differentiator";
import { MotionProvider, Reveal } from "./_components/reveal";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Slugy — Short Links That Track Revenue, Not Just Clicks",
    description:
      "Open-source link analytics that tracks revenue, not just clicks. Branded short links, custom domains, QR codes and a free UTM builder — no enterprise pricing.",
    url: "/",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy — short link analytics showing clicks, leads and revenue",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slugy — Short Links That Track Revenue, Not Just Clicks",
    description:
      "Open-source link analytics that tracks revenue, not just clicks. Branded short links, custom domains, QR codes and a free UTM builder.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const LOADING_HEIGHT = {
  features: "h-[400px]",
  integrations: "h-[420px]",
  stats: "h-[300px]",
  pricing: "h-[500px]",
  sponsors: "h-[280px]",
  faq: "h-[420px]",
  finalCta: "h-[380px]",
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

const IntegrationsSection = dynamic(
  () => import("./_components/integrations"),
  {
    loading: () => <SectionPlaceholder height={LOADING_HEIGHT.integrations} />,
  },
);

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
        <Reveal className="relative z-20 mx-auto max-w-6xl py-4">
          <Hero />
        </Reveal>
      </div>

      <div>
        <MotionProvider>
          <section id="features" className="scroll-mt-20">
            <Features />
          </section>

          <ToolsSection />

          <IntegrationsSection />

          <section id="stats-metrics" className="scroll-mt-20">
            <Stats />
          </section>

          <section id="sponsors" className="scroll-mt-20">
            <Sponsors />
          </section>

          {/* <Differentiator /> */}

          <section id="pricing" className="scroll-mt-20">
            <PricingSection />
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
