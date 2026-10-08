import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Integrations — Shopify, Zapier, Slack, WordPress & More",
  description:
    "Connect Slugy to Shopify, Zapier, Slack, Make, WordPress, Polar and Stripe. Trigger automations on leads and sales, and attribute revenue back to the short links that drove it.",
  keywords: [
    "integrate Shopify with URL shortener",
    "Zapier URL shortener integration",
    "Slugy integrations",
    "Shopify URL shortener integration",
    "Slack link shortening",
  ],
  alternates: { canonical: "/integrations" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Slugy Integrations — Shopify, Zapier, Slack & More",
    description:
      "Notifications where your team works, automation without glue code, and revenue attribution for every checkout.",
    url: "/integrations",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy integrations — Shopify, Zapier, Slack, WordPress",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slugy Integrations — Shopify, Zapier, Slack & More",
    description:
      "Notifications, automation, and revenue attribution for your short links.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const INTEGRATIONS = [
  {
    slug: "shopify",
    name: "Shopify",
    tagline: "Tie store revenue back to the short links behind it.",
    body: "Capture slugy_click_id at checkout with a web pixel and post orders to Slugy. Growth workspaces get sale attribution, conversions, and revenue reports per link.",
  },
  {
    slug: "zapier",
    name: "Zapier",
    tagline: "Trigger 7,000+ app workflows on every lead or sale.",
    body: "Forward lead.created and sale.created events to a Zapier catch hook. Add rows to Sheets, create CRM contacts, send emails — no glue code.",
  },
  {
    slug: "slack",
    name: "Slack",
    tagline: "Lead and sale alerts plus /shorten without leaving chat.",
    body: "Connect in Settings → Integrations, invite @slug to the channel, and send a test. Real-time notifications plus a /shorten slash command.",
  },
  {
    slug: "wordpress",
    name: "WordPress",
    tagline: "Auto-shorten every post link the moment you publish.",
    body: "Install the Slugy plugin, paste a Links-write API key, and turn on auto-shorten. Every post stores its short link as post metadata.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      name: "Slugy Integrations",
      description:
        "Guides for connecting Slugy to Shopify, Zapier, Slack, Make, WordPress, Polar and Stripe.",
      url: "/integrations",
      hasPart: INTEGRATIONS.map((i) => ({
        "@type": "SoftwareApplication",
        name: `Slugy for ${i.name}`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: `/integrations/${i.slug}`,
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
      ],
    },
  ],
};

export default function IntegrationsHubPage() {
  return (
    <main className="mt-[65px] min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-10 text-center sm:pt-20 sm:pb-16">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Integrations
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
          Plugs into the stack you already run
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-lg">
          Notifications where your team works, automation without glue code, and
          revenue attribution for the checkouts that matter. Every integration
          builds on the{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 text-[13px]">
            slugy_id
          </code>{" "}
          click id — see{" "}
          <Link
            href="/blogs/lead-conversion-tracking"
            className="font-medium underline underline-offset-4"
          >
            the lead tracking guide
          </Link>{" "}
          first if you have not set up conversion tracking.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">Connect free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/blogs/slugy-integrations">Read full setup guide</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-4 px-4 pb-16 sm:grid-cols-2">
        {INTEGRATIONS.map((i) => (
          <Link
            key={i.slug}
            href={
              i.slug === "shopify" || i.slug === "zapier"
                ? `/integrations/${i.slug}`
                : "/blogs/slugy-integrations"
            }
            className="group flex flex-col rounded-[20px] border p-6 transition-all hover:shadow-md"
          >
            <h2 className="flex items-center gap-2 text-lg font-medium">
              {i.name}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </h2>
            <p className="mt-1 text-sm font-medium text-orange-700 dark:text-orange-300">
              {i.tagline}
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {i.body}
            </p>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          How integration events work
        </h2>
        <ul className="mt-6 space-y-3">
          {[
            "lead.created fires when a visitor converts — needs a Pro workspace and the slugy_id click id captured on your site.",
            "sale.created fires when an order is attributed — needs a Growth workspace plus saleAmount and saleCurrency.",
            "Every webhook delivery is signed with HMAC_SHA256(secret, timestamp + '.' + body). Reject timestamps older than five minutes.",
            "Endpoints can be paused, removed, and inspected for failed deliveries from Settings → Integrations → Webhooks.",
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
        <p className="text-muted-foreground mt-6 text-sm leading-6">
          Two API scopes cover everything:{" "}
          <strong className="text-foreground">Links-write</strong> creates short
          links (WordPress plugin, Zapier actions, /shorten), and{" "}
          <strong className="text-foreground">Leads-write</strong> records leads
          and sales (Pro for leads, Growth for revenue). Full payload reference
          lives in{" "}
          <Link
            href="/blogs/slugy-integrations"
            className="font-medium underline underline-offset-4"
          >
            the integrations guide
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
