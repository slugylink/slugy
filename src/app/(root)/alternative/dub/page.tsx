import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import CompareTable from "../../_components/compare-table";
import Faq from "../../_components/faq";

export const metadata: Metadata = {
  title:
    "Dub.co Alternative Without $90/mo — Open-Source Link Attribution | Slugy",
  description:
    "The Dub.co alternative for startups: lead tracking from $8/mo and revenue attribution from $29/mo vs Dub Business $90/mo. Verified Dub Links pricing, honest tradeoffs, migration steps.",
  keywords: [
    "dub alternative",
    "dub.co alternative",
    "dub.co pricing",
    "open source dub alternative",
    "dub vs slugy",
  ],
  alternates: { canonical: "/alternative/dub" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Dub.co Alternative Without $90/mo | Slugy",
    description:
      "Lead + revenue attribution from $8/mo. Verified Dub Links pricing, honest tradeoffs, migration steps.",
    url: "/alternative/dub",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy — Dub.co alternative with lead and revenue attribution",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dub.co Alternative Without $90/mo | Slugy",
    description:
      "Lead + revenue attribution from $8/mo. Verified Dub Links pricing, honest tradeoffs, migration steps.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Slugy — Dub.co Alternative",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "/alternative/dub",
      description:
        "Open-source Dub.co alternative with branded links and lead + revenue attribution from $8/mo.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How much does Dub.co cost?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Per dub.co/pricing/links (checked 9 October 2026): free covers 25 links/month, 1K tracked events, and 3 custom domains. Paid Dub Links plans start at Pro $30/month (1K links, 50K events, no conversion tracking) and Business $90/month (10K links, 250K events, conversion tracking included). Verify current pricing before deciding.",
          },
        },
        {
          "@type": "Question",
          name: "Does Dub.co track conversions and revenue?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes — Dub.co tracks lead and sale events from its Business plan ($90/month) upward, with Stripe and Shopify integrations. Slugy's difference is entry price: lead tracking from Pro $8/month and revenue attribution from Growth $29/month.",
          },
        },
        {
          "@type": "Question",
          name: "Can I migrate from Dub.co to Slugy?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Export your links as CSV, connect your custom domain in Slugy with the guided DNS setup, import, and cut traffic over gradually — keep high-traffic links on Dub until Slugy click counts match for about a week.",
          },
        },
      ],
    },
  ],
};

const SWITCH_REASONS = [
  "Attribution from $8/mo — Dub.co unlocks conversion tracking at Business $90/mo; Slugy Pro tracks leads at $8 and Growth attributes revenue at $29",
  "Free tier that covers evaluation — 10 links/mo, 1k clicks, 1 custom domain, no credit card",
  "Bio pages and QR codes bundled with every workspace, not gated behind higher tiers",
  "MIT-licensed public codebase you can self-host commercially — no AGPL copyleft constraints",
];

const STEPS = [
  {
    title: "Export from Dub.co",
    body: "Take the CSV export before canceling anything, so you have a clean source of truth for slugs and destinations.",
  },
  {
    title: "Connect your domain",
    body: "Add your custom domain in Slugy and follow the DNS instructions — subdomain CNAME or apex A record, SSL automatic.",
  },
  {
    title: "Import and cut over gradually",
    body: "Import the CSV, reconcile the collision report, and keep highest-traffic links on Dub until Slugy analytics match for a week.",
  },
];

export default function DubAlternativePage() {
  return (
    <main className="mt-[65px] min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-10 text-center sm:pt-20 sm:pb-16">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Dub.co alternative
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
          The Dub.co alternative without the $90/mo entry to attribution
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-lg">
          Dub.co is excellent and honest about it — but its conversion tracking
          starts at Business $90/mo. Slugy tracks leads from $8 and revenue from
          $29, open source.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">Switch to Slugy free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">View pricing</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Why teams switch from Dub.co
        </h2>
        <ul className="mt-6 space-y-3">
          {SWITCH_REASONS.map((r) => (
            <li
              key={r}
              className="flex items-start gap-2.5 text-sm sm:text-base"
            >
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        <h2 className="text-center text-2xl font-medium tracking-tight text-balance sm:text-3xl">
          Slugy vs Dub.co vs Bitly
        </h2>
        <div className="mt-8 rounded-[20px] border bg-white p-4 sm:p-6 dark:bg-zinc-950">
          <CompareTable />
        </div>
        <p className="text-muted-foreground mt-4 text-center text-xs">
          Dub.co Links figures from dub.co/pricing/links, checked 9 October 2026
          (Free: 25 links/mo, 1K events, 3 domains; Pro $30/mo: 1K links, 50K
          events, no conversion tracking; Business $90/mo: conversion tracking
          included). Plans change — verify before deciding.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Where Dub.co stays the better pick
        </h2>
        <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
          Ecosystem maturity, docs depth, integrations, and community support —
          plus a longer uptime track record. If you already run Dub or build on
          its API, there is no reason to move. The full honest tradeoff list is
          in{" "}
          <Link
            href="/blogs/slugy-vs-dub"
            className="font-medium underline underline-offset-4"
          >
            Slugy vs Dub.co, evaluated
          </Link>
          .
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Migrate in three steps
        </h2>
        <ol className="mt-6 space-y-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="bg-foreground text-background flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">Start your migration</Link>
          </Button>
        </div>
      </section>

      <Faq />

      <section className="mx-auto max-w-6xl px-4 pt-4 pb-16 text-center sm:pb-20">
        <h2 className="text-2xl font-medium text-balance sm:text-4xl">
          Attribution at a startup price
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-base">
          Leads from $8/mo, revenue from $29/mo — with the same open-source
          transparency as the tool you are leaving.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">
              Create your first campaign link
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
