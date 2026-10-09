import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Conversion Tracking API — POST /api/leads_track | Slugy Docs",
  description:
    "Reference for POST /api/leads_track: Bearer auth, clickId + eventName + customerExternalId, saleAmount/saleCurrency on Growth, idempotent replays, 404/422/429 codes.",
  alternates: { canonical: "/docs/conversions" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Conversion Tracking API — POST /api/leads_track | Slugy Docs",
    description:
      "Endpoint reference: auth, fields, responses, idempotency, and the 90-day attribution window.",
    url: "/docs/conversions",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy conversion tracking API reference",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Conversion Tracking API — POST /api/leads_track | Slugy Docs",
    description:
      "Endpoint reference: auth, fields, responses, idempotency, and the 90-day attribution window.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const FIELDS = [
  "clickId (string, required): the slugy_click_id captured at landing. Unknown or cross-workspace IDs return 404.",
  "eventName (string ≤120 chars, required): e.g. “Sign up”, “Purchase”. Dedup key includes this — distinct names count separately.",
  "customerExternalId (string ≤255 chars, required): your user or order ID. Dedup key includes this — replays are idempotent.",
  "customerEmail (email, optional): attribution identity; falls back gracefully when omitted.",
  "customerName (string, optional): stored on the customer record.",
  "metadata (JSON object, optional): must be JSON-serializable; forwarded to webhooks.",
  "saleAmount (positive number, optional): revenue in major units. Growth-only — other plans get 403.",
  "saleCurrency (3-letter code, optional): normalized to uppercase, e.g. USD.",
];

const RESPONSES = [
  "201 Created — { leadEventId } on first recording (200 with “Sale already recorded” on idempotent replay).",
  "404 — unknown clickId (or cross-workspace ID). Log and continue; the underlying signup/order still exists in your system.",
  "422 — missing clickId/eventName/customerExternalId or non-serializable metadata.",
  "403 — lead tracking needs Pro/Growth; saleAmount needs Growth. API-key scope failures also land here.",
  "401 — missing/invalid Bearer key. 429 — per-key throttle (300/min).",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      headline: "Conversion Tracking API reference (POST /api/leads_track)",
      description:
        "Auth, fields, responses, idempotency, and attribution rules for lead and sale events.",
      author: {
        "@type": "Organization",
        name: "Slugy",
        url: "https://slugy.co",
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "/" },
        { "@type": "ListItem", position: 2, name: "Docs", item: "/docs" },
        {
          "@type": "ListItem",
          position: 3,
          name: "Conversions API",
          item: "/docs/conversions",
        },
      ],
    },
  ],
};

export default function ConversionsDocsPage() {
  return (
    <main className="mt-[65px] min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-10 sm:pt-20 sm:pb-16">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Docs · Conversions API
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
          POST /api/leads_track
        </h1>
        <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
          Record a lead or sale against the click that drove it. Bearer-auth
          with a workspace API key (write scope). Concept walkthrough:{" "}
          <Link
            href="/features/conversion-tracking"
            className="font-medium underline underline-offset-4"
          >
            conversion tracking
          </Link>
          .
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Request
        </h2>
        <pre className="mt-4 overflow-x-auto rounded-lg border bg-zinc-950 p-4 text-[13px] leading-6 text-zinc-100">
          <code>{`POST https://slugy.co/api/leads_track
Authorization: Bearer <workspace API key>
Content-Type: application/json

{
  "clickId": "clk_abc123",
  "eventName": "Sign up",
  "customerExternalId": "user_123",
  "customerEmail": "buyer@example.com"
}`}</code>
        </pre>
        <ul className="mt-6 space-y-3">
          {FIELDS.map((t) => (
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
          Responses
        </h2>
        <ul className="mt-6 space-y-3">
          {RESPONSES.map((t) => (
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
          Attribution rules (90-day window, last-click-wins, idempotent replays)
          are explained in{" "}
          <Link
            href="/features/conversion-tracking"
            className="font-medium underline underline-offset-4"
          >
            the feature guide
          </Link>
          . Fan-out to automation:{" "}
          <Link
            href="/docs/webhooks"
            className="font-medium underline underline-offset-4"
          >
            webhooks
          </Link>
          .
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">Get an API key</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
