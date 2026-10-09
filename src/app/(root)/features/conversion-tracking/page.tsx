import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Link Conversion Tracking for Leads & Signups | Slugy",
  description:
    "Track which short links generate leads and signups. Capture click IDs, send lead events, and attribute revenue per link — Pro for leads, Growth for sales.",
  keywords: [
    "link conversion tracking",
    "short link conversion tracking",
    "track sales from short links",
    "link revenue attribution",
    "UTM to conversion workflow",
  ],
  alternates: { canonical: "/features/conversion-tracking" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Link Conversion Tracking for Leads & Signups | Slugy",
    description:
      "See which short links generate leads and revenue — click to signup to sale, attributed per link.",
    url: "/features/conversion-tracking",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy conversion tracking — clicks, leads and revenue per link",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Link Conversion Tracking for Leads & Signups | Slugy",
    description:
      "See which short links generate leads and revenue — click to signup to sale, attributed per link.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const STEPS = [
  {
    title: "Share a tracked short link",
    body: "Create a branded short link for each campaign — influencer, ad, email, QR on packaging. Every click gets a unique slugy_click_id in the URL and a first-party cookie.",
  },
  {
    title: "Capture the click ID on your site",
    body: "Read slugy_click_id from the URL or cookie on landing and persist it (cookie or localStorage, 30–90 day TTL) through to signup or checkout. Without this ID, the conversion cannot be attributed.",
  },
  {
    title: "Send the lead or sale event",
    body: "POST lead.created (Pro) or sale.created with saleAmount/saleCurrency (Growth) to Slugy's API with the click ID. The event binds to the original link, workspace, and campaign.",
  },
  {
    title: "Report revenue per link",
    body: "Compare influencer A vs B on actual orders and dollars — clicks, conversion rate, and revenue per slug in one dashboard.",
  },
];

const LIMITS = [
  "Last-click attribution only — the most recent tracked click wins. Multi-touch journeys are not modeled.",
  "Same-browser attribution — cross-device journeys (phone click, laptop purchase) are not linked without a shared identifier you provide.",
  "Cookie/consent dependent — blocked third-party contexts and rejected consent banners break the chain. First-party persistence is required.",
  "Unknown click IDs return 404 — log and continue; the underlying signup or order still exists in your system.",
  "Lead events need Pro; revenue fields (saleAmount/saleCurrency) need Growth and return 403 otherwise.",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Slugy Conversion Tracking",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "/features/conversion-tracking",
      description:
        "Attribute leads and sales back to the short links that drove them. Lead tracking on Pro, revenue attribution on Growth — see /pricing.",
    },
    {
      "@type": "HowTo",
      name: "How to track conversions from short links",
      step: STEPS.map((s) => ({
        "@type": "HowToStep",
        text: `${s.title}: ${s.body}`,
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Conversion Tracking",
          item: "/features/conversion-tracking",
        },
      ],
    },
  ],
};

export default function ConversionTrackingPage() {
  return (
    <main className="mt-[65px] min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-10 text-center sm:pt-20 sm:pb-16">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Feature · Conversion tracking
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
          Track which short links generate leads
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-lg">
          Clicks tell you who visited. Slugy tells you who converted — which
          link drove the signup, and which drove the sale.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">
              Track your first conversion
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">Pro &amp; Growth pricing</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          What conversion tracking for short links actually means
        </h2>
        <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
          A visitor clicks your short link, lands with a{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 text-[13px]">
            slugy_click_id
          </code>
          , and later signs up or buys. Slugy joins that event back to the
          original click — so influencer B&apos;s 34 orders worth $1,740 beats
          influencer A&apos;s 12 orders worth $580 even when both got ~1,000
          clicks. Who benefits most: indie SaaS founders and performance
          marketers comparing campaigns, ecommerce operators attributing
          influencer sales, and agencies reporting per-client results. Full
          method in{" "}
          <Link
            href="/blogs/lead-conversion-tracking"
            className="font-medium underline underline-offset-4"
          >
            how to track link conversions
          </Link>{" "}
          and the{" "}
          <Link
            href="/integrations/shopify"
            className="font-medium underline underline-offset-4"
          >
            Shopify revenue guide
          </Link>
          .
        </p>
        <ol className="mt-8 space-y-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="bg-foreground text-background flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-7">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Minimal integration example
        </h2>
        <pre className="mt-4 overflow-x-auto rounded-lg border bg-zinc-950 p-4 text-[13px] leading-6 text-zinc-100">
          <code>{`// 1. Capture on landing (cookie lives up to 90 days)
const clickId =
  new URLSearchParams(location.search).get("slugy_click_id") ??
  document.cookie.match(/slugy_click_id=([^;]+)/)?.[1];
if (clickId) localStorage.setItem("slugy_click_id", clickId);

// 2. Send at signup / checkout (Pro for leads, Growth for revenue)
await fetch("https://slugy.co/api/leads_track", {
  method: "POST",
  headers: {
    Authorization: "Bearer <workspace API key>",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    clickId: localStorage.getItem("slugy_click_id"),
    eventName: "Sign up", // any name; repeats dedupe per customer
    customerExternalId: user.id, // your user/order id (required)
    customerEmail: user.email, // optional, used for attribution identity
    // saleAmount: 49, saleCurrency: "USD", // Growth only
  }),
});`}</code>
        </pre>
        <p className="text-muted-foreground mt-4 text-sm leading-7">
          Prefer no-code? Route{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 text-[13px]">
            sale.created
          </code>{" "}
          through{" "}
          <Link
            href="/integrations/zapier"
            className="font-medium underline underline-offset-4"
          >
            Zapier
          </Link>{" "}
          into your CRM, Sheets, or Slack.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Deduplication, attribution windows, and consent
        </h2>
        <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
          The actual data model, so you can reason about edge cases instead of
          trusting a black box:
        </p>
        <ul className="mt-6 space-y-3">
          {[
            "Deduplication is per customer and event: replays of the same (workspace, customer, eventName) are idempotent and never double-count. Distinct event names (e.g. “Sign up” vs “Purchase”) count separately. On the signup self-attribution path, workspace owners and members are skipped, so testing your own links does not pollute lead stats.",
            "Attribution window is 90 days: the first-party cookie lives up to 90 days and the server-side click record expires after 90 days. Conversions arriving later return 404 for the click and are not attributed.",
            "Last click wins: the browser holds the most recent click ID, so a later click overwrites an earlier one. Multi-touch journeys are not modeled.",
            "Consent and blockers matter: the chain needs the first-party cookie or a persisted ID you store yourself. Rejected consent, private browsing, and cross-device jumps (phone click, laptop purchase) break attribution — there is no probabilistic stitching.",
            "No flawless causal measurement is implied: attributed revenue means “this purchase followed that tracked click within the window”, not proof the click caused the purchase.",
          ].map((t) => (
            <li
              key={t}
              className="flex items-start gap-2.5 text-sm sm:text-base"
            >
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Honest limitations
        </h2>
        <ul className="mt-6 space-y-3">
          {LIMITS.map((t) => (
            <li
              key={t}
              className="flex items-start gap-2.5 text-sm sm:text-base"
            >
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 text-center sm:py-16">
        <h2 className="text-2xl font-medium text-balance sm:text-4xl">
          Prove which links pay for themselves
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-base">
          Lead attribution on Pro ($8/mo), revenue attribution on Growth
          ($29/mo). Free to start — upgrade when the first conversion lands.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">Start tracking free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/integrations/shopify">See the Shopify example</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
