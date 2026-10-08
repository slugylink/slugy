import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Integrate Shopify with Slugy — Attribute Revenue to Short Links",
  description:
    "Step-by-step guide to integrate Shopify with Slugy: capture slugy_click_id with a web pixel, post orders to Slugy, and track link conversions and revenue per short link.",
  keywords: [
    "integrate Shopify with URL shortener",
    "Shopify URL shortener integration",
    "track revenue with URL shortener",
    "Shopify link attribution",
    "how to track link conversions",
  ],
  alternates: { canonical: "/integrations/shopify" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Integrating Slugy with Shopify — Step-by-Step Guide",
    description:
      "Tie Shopify orders back to the short links that drove them. Web pixel to sale attribution in minutes.",
    url: "/integrations/shopify",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy Shopify integration — revenue attribution per short link",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Integrating Slugy with Shopify — Step-by-Step Guide",
    description: "Tie Shopify orders back to the short links that drove them.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const STEPS = [
  {
    title: "Tag outbound links with UTMs and short links",
    body: "Create a branded short link in Slugy for every campaign — product launches, influencer codes, email drops, QR on packaging. Append UTM source/medium/campaign (use the free UTM builder) so GA4 and Slugy agree on attribution. Share the short link everywhere instead of the raw myshopify URL.",
  },
  {
    title: "Capture slugy_click_id on your storefront",
    body: "When a visitor lands via a Slugy link, Slugy sets a first-party slugy_click_id in the URL and cookie. Add a Shopify web pixel (Settings → Customer events → Add custom pixel) that reads the id from the URL or cookie and persists it through to checkout — localStorage or a checkout attribute both work. Without this id, orders cannot be attributed.",
  },
  {
    title: "Post the order to Slugy at checkout",
    body: "On order creation, POST to /api/integrations/shopify/order with a Leads-write API key (Settings → API Keys) or your shared HMAC secret. Include clickId, orderId, customerEmail, saleAmount and saleCurrency. Growth workspaces record a sale event against the original link; Pro/Free get a 403 for revenue fields and a 404 for unknown clicks.",
  },
  {
    title: "Analyze revenue per link",
    body: "Open the analytics dashboard: clicks, leads, conversion rate, and revenue per slug. Compare influencer A vs influencer B on actual dollars, not clicks. Route sale.created to Slack for instant sale alerts or to Zapier to update your CRM, Sheets, or email flows.",
  },
];

const FAQS = [
  {
    q: "Do I need a Shopify app install?",
    a: "No. Slugy uses a lightweight web pixel plus a server-side order POST — no app review, no theme edits. Paste the pixel once, then forward orders with an API key.",
  },
  {
    q: "Which plan do I need for revenue tracking?",
    a: "Lead events (lead.created) need Pro. Revenue events (sale.created with saleAmount/saleCurrency) need Growth. Click analytics work on every plan including free.",
  },
  {
    q: "What if a buyer comes back later without the link?",
    a: "Persist the click id in a first-party cookie or localStorage with a 30–90 day TTL, then attach it at checkout. Last-click attribution wins, matching how most e-commerce teams report influencer and ad spend.",
  },
  {
    q: "Does this work with Shopify Flow?",
    a: "Yes. Trigger a Flow workflow on order creation, read the stored click id, and POST it to Slugy. The same payload shape works from pixels, Flow, or your own server.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "HowTo",
      name: "How to integrate Shopify with Slugy",
      description:
        "Attribute Shopify orders back to the short links that drove them.",
      step: STEPS.map((s) => ({
        "@type": "HowToStep",
        text: `${s.title}: ${s.body}`,
      })),
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Integrations",
          item: "/integrations",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Shopify",
          item: "/integrations/shopify",
        },
      ],
    },
  ],
};

export default function ShopifyIntegrationPage() {
  return (
    <main className="mt-[65px] min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-10 text-center sm:pt-20 sm:pb-16">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Integration · Shopify
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
          Integrate Shopify with Slugy: track revenue, not just clicks
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-lg">
          The best URL shortener for tracking revenue on Shopify — tie every
          order back to the short link, influencer, or QR code that drove it.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">
              Start tracking revenue
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">View Growth pricing</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          How it works
        </h2>
        <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
          Traditional click tracking tells you a link got 1,000 clicks. Slugy
          tells you those clicks turned into 42 orders worth $2,180 — broken
          down by link, campaign, and channel. The bridge is a click id (
          <code className="bg-muted rounded px-1.5 py-0.5 text-[13px]">
            slugy_click_id
          </code>
          ) captured at landing and replayed at checkout. For the API
          background, read{" "}
          <Link
            href="/blogs/lead-conversion-tracking"
            className="font-medium underline underline-offset-4"
          >
            how to track link conversions
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
          Example order payload
        </h2>
        <pre className="mt-4 overflow-x-auto rounded-lg border bg-zinc-950 p-4 text-[13px] leading-6 text-zinc-100">
          <code>{`POST /api/integrations/shopify/order
Authorization: Bearer <leads-write API key>
Content-Type: application/json

{
  "clickId": "clk_abc123",
  "orderId": "gid://shopify/Order/123",
  "customerEmail": "buyer@example.com",
  "saleAmount": 49,
  "saleCurrency": "USD"
}`}</code>
        </pre>
        <ul className="mt-6 space-y-3">
          {[
            "Authentication: shared HMAC secret or a workspace API key with leads-write scope (binds the sale to that workspace).",
            "Unknown click ids return 404 — log and continue; the order still exists in Shopify.",
            "Non-Growth workspaces get 403 for revenue fields — upgrade to Growth to unlock sales analytics.",
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
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">FAQ</h2>
        <div className="mt-6 space-y-6">
          {FAQS.map((f) => (
            <div key={f.q}>
              <p className="font-medium">{f.q}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-7">
                {f.a}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">Connect Shopify</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/integrations">All integrations</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
