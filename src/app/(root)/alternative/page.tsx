import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Slugy Alternatives Compared — Bitly, Dub.co & More | Slugy",
  description:
    "Honest, date-stamped comparisons of Slugy vs Bitly, Dub.co, and others — pricing, attribution, and migration notes. Commercial summaries plus in-depth editorial reviews.",
  alternates: { canonical: "/alternative" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Slugy Alternatives Compared — Bitly, Dub.co & More | Slugy",
    description:
      "Date-stamped Slugy vs competitor comparisons with verified pricing and honest tradeoffs.",
    url: "/alternative",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy competitor comparisons with verified pricing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slugy Alternatives Compared — Bitly, Dub.co & More | Slugy",
    description:
      "Date-stamped Slugy vs competitor comparisons with verified pricing and honest tradeoffs.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const ALTERNATIVES = [
  {
    href: "/alternative/bitly",
    badge: "Commercial summary",
    title: "Bitly Alternative",
    description:
      "Branded links, QR codes, and conversion tracking without enterprise pricing. Migration in three steps.",
    keywords: "bitly alternative · switch from bitly",
  },
  {
    href: "/alternative/dub",
    badge: "Commercial summary",
    title: "Dub.co Alternative",
    description:
      "Lead and revenue attribution from $8/mo instead of $90/mo. Verified Dub Links pricing, honest tradeoffs.",
    keywords: "dub alternative · dub.co pricing",
  },
];

const EDITORIAL = [
  {
    href: "/blogs/slugy-vs-bitly",
    label: "Slugy vs Bitly — full evaluation",
    note: "enterprise strengths, tradeoffs, staged migration",
  },
  {
    href: "/blogs/slugy-vs-dub",
    label: "Slugy vs Dub.co — full evaluation",
    note: "ecosystem maturity vs startup pricing",
  },
  {
    href: "/blogs/slugy-vs-short-io",
    label: "Slugy vs Short.io",
    note: "when API scale beats setup speed",
  },
  {
    href: "/blogs/slugy-vs-rebrandly",
    label: "Slugy vs Rebrandly",
    note: "branding-first versus analytics-first",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Slugy Competitor Comparisons",
  description:
    "Date-stamped commercial summaries and editorial evaluations of Slugy vs Bitly, Dub.co, and others.",
  hasPart: ALTERNATIVES.map((a) => ({
    "@type": "WebPage",
    name: `Slugy ${a.title}`,
    url: a.href,
  })),
};

export default function AlternativeHubPage() {
  return (
    <main className="mt-[65px] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-6 text-center sm:pt-16">
        <Badge variant="secondary" className="mb-4">
          Compare · Verified October 2026
        </Badge>
        <h1 className="mx-auto max-w-2xl text-2xl font-medium tracking-tight text-balance sm:text-[32px] sm:leading-[1.15]">
          Slugy vs the shortener you already know
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-base">
          Short commercial summaries below; full editorial evaluations linked
          under each. Every competitor figure carries a checked date — plans
          change, so verify before you buy.
        </p>
      </section>

      <section className="mx-auto grid max-w-4xl gap-4 px-4 pb-12 sm:grid-cols-2">
        {ALTERNATIVES.map((alt) => (
          <Link key={alt.href} href={alt.href} className="group">
            <Card className="h-full gap-3 border-zinc-200 p-6 transition-all group-hover:shadow-md dark:border-white/10">
              <CardContent className="flex flex-col gap-3 p-0">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[11px]">
                    {alt.badge}
                  </Badge>
                </div>
                <h2 className="flex items-center gap-2 text-lg leading-none font-medium">
                  {alt.title}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </h2>
                <CardDescription className="text-sm leading-relaxed">
                  {alt.description}
                </CardDescription>
                <p className="text-muted-foreground text-xs">{alt.keywords}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-20">
        <h2 className="text-xl font-medium tracking-tight">
          In-depth editorial evaluations
        </h2>
        <ul className="mt-4 space-y-3">
          {EDITORIAL.map((e) => (
            <li key={e.href} className="text-sm sm:text-base">
              <Link
                href={e.href}
                className="font-medium underline underline-offset-4"
              >
                {e.label}
              </Link>{" "}
              <span className="text-muted-foreground">— {e.note}.</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
