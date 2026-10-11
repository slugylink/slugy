import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { brandFor } from "@/lib/integrations/branding";

export const metadata: Metadata = {
  title: "Integrations — Slack, Zapier, Shopify, Stripe, WordPress & More",
  description:
    "Connect Slugy to Slack, Zapier, Make, Shopify, Stripe, Polar, Segment and WordPress. Trigger automations on leads and sales, and attribute revenue back to the short links that drove it.",
  keywords: [
    "integrate Shopify with URL shortener",
    "Zapier URL shortener integration",
    "Slugy integrations",
    "Shopify URL shortener integration",
    "Slack link shortening",
    "Stripe revenue attribution links",
  ],
  alternates: { canonical: "/integrations" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Slugy Integrations — Slack, Zapier, Shopify, Stripe & More",
    description:
      "Notifications where your team works, automation without glue code, and revenue attribution for every checkout.",
    url: "/integrations",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy integrations — Slack, Zapier, Shopify, Stripe, WordPress",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slugy Integrations — Slack, Zapier, Shopify, Stripe & More",
    description:
      "Notifications, automation, and revenue attribution for your short links.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

interface Integration {
  provider: string;
  name: string;
  tagline: string;
  body: string;
  href: string;
}

const GROUPS: Array<{ label: string; items: Integration[] }> = [
  {
    label: "Notifications",
    items: [
      {
        provider: "slack",
        name: "Slack",
        tagline: "Lead and sale alerts plus /shorten without leaving chat.",
        body: "Connect in Settings → Integrations, invite @slug to the channel, and send a test. Real-time notifications plus a /shorten slash command.",
        href: "/blogs/slugy-integrations",
      },
    ],
  },
  {
    label: "Automation",
    items: [
      {
        provider: "zapier",
        name: "Zapier",
        tagline: "Trigger 7,000+ app workflows on every lead or sale.",
        body: "Forward lead.created and sale.created events to a Zapier catch hook. Add rows to Sheets, create CRM contacts, send emails — no glue code.",
        href: "/integrations/zapier",
      },
      {
        provider: "make",
        name: "Make",
        tagline: "Route link events through 2,000+ visual scenarios.",
        body: "Point the same lead and sale events at a Make webhook and build visual scenarios — routers, filters and iterators included.",
        href: "/blogs/slugy-integrations",
      },
    ],
  },
  {
    label: "Revenue attribution",
    items: [
      {
        provider: "shopify",
        name: "Shopify",
        tagline: "Tie store revenue back to the short links behind it.",
        body: "Capture slugy_click_id at checkout with a web pixel and post orders to Slugy. Growth workspaces get sale attribution, conversions, and revenue reports per link.",
        href: "/integrations/shopify",
      },
      {
        provider: "stripe",
        name: "Stripe",
        tagline: "Attribute checkouts to the links that drove them.",
        body: "Pass the click id through your checkout and post the payment to Slugy. Every sale lands on the link report it belongs to.",
        href: "/blogs/slugy-integrations",
      },
      {
        provider: "polar",
        name: "Polar",
        tagline: "Attribute orders to the clicks that drove them.",
        body: "Polar checkouts carry the click id into orders automatically. Paid plans reconcile against the links behind them.",
        href: "/blogs/slugy-integrations",
      },
      {
        provider: "segment",
        name: "Segment",
        tagline: "Stream lead and sale events into your warehouse.",
        body: "Forward the same events to Segment and fan out to your warehouse and every connected destination.",
        href: "/blogs/slugy-integrations",
      },
    ],
  },
  {
    label: "Publishing",
    items: [
      {
        provider: "wordpress",
        name: "WordPress",
        tagline: "Auto-shorten every post link the moment you publish.",
        body: "Install the Slugy plugin, paste a Links-write API key, and turn on auto-shorten. Every post stores its short link as post metadata.",
        href: "/blogs/slugy-integrations",
      },
    ],
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      name: "Slugy Integrations",
      description:
        "Guides for connecting Slugy to Slack, Zapier, Make, Shopify, Stripe, Polar, Segment and WordPress.",
      url: "/integrations",
      hasPart: GROUPS.flatMap((g) =>
        g.items.map((i) => ({
          "@type": "SoftwareApplication",
          name: `Slugy for ${i.name}`,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: i.href,
        })),
      ),
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

function IntegrationCard({ item }: { item: Integration }) {
  const brand = brandFor(item.provider);
  return (
    <Link
      href={item.href}
      className="group flex flex-col rounded-[20px] border p-6 transition-all hover:shadow-md"
    >
      <div className="bg-muted flex h-9 w-9 items-center justify-center rounded-md">
        {brand.src ? (
          <Image
            src={brand.src}
            alt=""
            width={16}
            height={16}
            className={brand.invertOnDark ? "dark:invert" : undefined}
          />
        ) : (
          brand.Icon && <brand.Icon className="h-4 w-4" aria-hidden />
        )}
      </div>
      <h3 className="mt-3 flex items-center gap-2 text-lg font-medium">
        {item.name}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </h3>
      <p className="mt-1 text-sm font-medium text-orange-700 dark:text-orange-300">
        {item.tagline}
      </p>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        {item.body}
      </p>
    </Link>
  );
}

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

      {GROUPS.map((group) => (
        <section
          key={group.label}
          className="mx-auto max-w-4xl px-4 pb-10 last:pb-16"
        >
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            {group.label}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {group.items.map((item) => (
              <IntegrationCard key={item.provider} item={item} />
            ))}
          </div>
        </section>
      ))}

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
