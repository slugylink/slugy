import dynamic from "next/dynamic";
import Hero from "./_components/hero";

const LOADING_HEIGHT = {
  features: "h-[400px]",
  stats: "h-[300px]",
  pricing: "h-[500px]",
  openSource: "h-[300px]",
  video: "h-[420px]",
  sponsors: "h-[280px]",
} as const;

function SectionPlaceholder({ height }: { height: string }) {
  return <div className={`${height} w-full`} aria-hidden />;
}

// Below-the-fold: defer JS; reserved height avoids layout jump
const Features = dynamic(() => import("./_components/feature"), {
  loading: () => <SectionPlaceholder height={LOADING_HEIGHT.features} />,
});

const VideoDemoSection = dynamic(() => import("./_components/video-demo"), {
  loading: () => <SectionPlaceholder height={LOADING_HEIGHT.video} />,
});

const PricingSection = dynamic(
  () => import("@/components/web/_pricing/pricing-section"),
  {
    loading: () => <SectionPlaceholder height={LOADING_HEIGHT.pricing} />,
  },
);

const Stats = dynamic(() => import("./_components/stats"), {
  loading: () => <SectionPlaceholder height={LOADING_HEIGHT.stats} />,
});

const Sponsors = dynamic(() => import("./_components/sponsors"), {
  loading: () => <SectionPlaceholder height={LOADING_HEIGHT.sponsors} />,
});

const OpenSource = dynamic(() => import("./_components/open-source"), {
  loading: () => <SectionPlaceholder height={LOADING_HEIGHT.openSource} />,
});

export default function Home() {
  return (
    <main className="mt-[65px] min-h-screen overflow-x-hidden">
      <div className="landing-hero-shell relative mx-auto w-[99%] overflow-hidden rounded-3xl border py-8 pb-16">
        <div className="landing-hero-glow pointer-events-none absolute inset-0" />
        <div className="relative z-20 mx-auto max-w-6xl py-4">
          <Hero />
        </div>
      </div>

      <div>
        <section id="features" className="scroll-mt-20">
          <Features />
        </section>

        <section id="stats" className="scroll-mt-20">
          <VideoDemoSection />
        </section>

        <section id="pricing" className="scroll-mt-20">
          <PricingSection />
        </section>

        <section id="stats-metrics" className="scroll-mt-20">
          <Stats />
        </section>

        <section id="sponsors" className="scroll-mt-20">
          <Sponsors />
        </section>

        <section id="open-source" className="scroll-mt-20">
          <OpenSource />
        </section>
      </div>
    </main>
  );
}
