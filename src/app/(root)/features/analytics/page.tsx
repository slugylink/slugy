import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Short Link Analytics — Clicks, Devices & Referrers | Slugy",
  description:
    "Per-link analytics: clicks, referrers, countries, devices, browsers, and UTM breakdowns — with bot filtering and 30-day to 24-month retention by plan.",
  keywords: [
    "short link analytics",
    "link click analytics",
    "URL shortener analytics",
    "track link clicks by country device",
    "UTM analytics per link",
  ],
  alternates: { canonical: "/features/analytics" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Short Link Analytics — Clicks, Devices & Referrers | Slugy",
    description:
      "Clicks, referrers, countries, devices, and UTM breakdowns per link — bots filtered out.",
    url: "/features/analytics",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy link analytics — clicks broken down per short link",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Short Link Analytics — Clicks, Devices & Referrers | Slugy",
    description:
      "Clicks, referrers, countries, devices, and UTM breakdowns per link — bots filtered out.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const DIMENSIONS = [
  {
    title: "Clicks over time",
    body: "Time-series per link, campaign, and domain — see the spike from last night's post, not just a lifetime total.",
  },
  {
    title: "Referrers and UTMs",
    body: "Where traffic came from: referrer host plus utm_source, medium, campaign, term, and content — reconciling with GA4 when you build URLs with the free UTM builder.",
  },
  {
    title: "Geography",
    body: "Country, region, and city breakdowns per link, resolved server-side at click time.",
  },
  {
    title: "Devices, browsers, OS",
    body: "Mobile vs desktop, browser, and operating system splits — so a QR-on-packaging link reads differently from an email link, as it should.",
  },
  {
    title: "Bot and prefetch filtering",
    body: "Crawler hits and browser prefetch requests are detected and excluded from human click counts before they ever reach your dashboard.",
  },
];

const NOTES = [
  "Free includes click analytics with 30-day retention and 1k tracked clicks/month.",
  "Pro extends to 10k clicks/month with 12-month retention; Growth to 50k clicks/month with 24-month retention.",
  "Clicks answer “who visited”. For “who converted”, add lead tracking (Pro) or revenue attribution (Growth).",
  "Retention windows apply per plan — compare like-for-like periods when reporting across upgrades.",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Slugy Link Analytics",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "/features/analytics",
      description:
        "Per-link click analytics with referrers, geography, devices, and UTM breakdowns.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Features",
          item: "/features",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Analytics",
          item: "/features/analytics",
        },
      ],
    },
  ],
};

export default function AnalyticsPage() {
  return (
    <main className="mt-[65px] min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-10 text-center sm:pt-20 sm:pb-16">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Feature · Analytics
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
          Analytics beyond click counts
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-lg">
          Who clicked, from where, on what — broken down per link, with bots
          filtered out before they reach your numbers.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">
              See your first click report
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/features/conversion-tracking">
              Add conversion tracking
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Five breakdowns on every link
        </h2>
        <div className="mt-8 space-y-8">
          {DIMENSIONS.map((d) => (
            <div key={d.title}>
              <p className="font-medium">{d.title}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-7">
                {d.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Retention and limits
        </h2>
        <ul className="mt-6 space-y-3">
          {NOTES.map((t) => (
            <li
              key={t}
              className="flex items-start gap-2.5 text-sm sm:text-base"
            >
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-6 text-sm leading-7">
          Full numbers on{" "}
          <Link
            href="/pricing"
            className="font-medium underline underline-offset-4"
          >
            pricing
          </Link>
          . Methodology questions? Ask in{" "}
          <Link
            href="https://github.com/slugylink/slugy/discussions"
            className="font-medium underline underline-offset-4"
          >
            GitHub Discussions
          </Link>
          .
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 text-center sm:py-16">
        <h2 className="text-2xl font-medium text-balance sm:text-4xl">
          Know which links earn their keep
        </h2>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">Start tracking free</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
