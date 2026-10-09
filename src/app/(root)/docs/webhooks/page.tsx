import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Webhooks — lead.created & sale.created Fan-Out | Slugy Docs",
  description:
    "Subscribe lead.created and sale.created events to any HTTPS endpoint. Signed JSON envelope, HMAC-SHA256 verification, retries, and delivery log.",
  alternates: { canonical: "/docs/webhooks" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Webhooks — lead.created & sale.created Fan-Out | Slugy Docs",
    description:
      "Signed event fan-out with HMAC verification, retries, and a delivery log.",
    url: "/docs/webhooks",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy webhooks documentation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Webhooks — lead.created & sale.created Fan-Out | Slugy Docs",
    description:
      "Signed event fan-out with HMAC verification, retries, and a delivery log.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const FACTS = [
  "Events: exactly two — lead.created (Pro+) and sale.created (Growth for revenue fields). Select per endpoint in Settings → Integrations → Webhooks.",
  "Fan-out: every active endpoint subscribed to the event receives it — attach Zapier, Make, and Segment at once.",
  "Envelope (JSON): { event, workspaceId, createdAt, data } where data carries leadEventId, linkId, slug, domain, url, clickId, eventName, customerExternalId, customerEmail, customerName, saleAmount, saleCurrency.",
  "Signing: endpoints with a secret get slugy-timestamp + slugy-signature headers, where signature = v1=HMAC_SHA256(secret, timestamp.body). Endpoints without a secret receive unsigned POSTs (fine for Zapier/Make catch hooks).",
  "Retries: background delivery retries up to 8 times; each attempt is recorded in the per-endpoint delivery log with pending/success/failed status. Old deliveries are purged automatically by a scheduled job.",
  "Test safely: use the Send test button on the webhook card, then pause the endpoint toggle while debugging — no need to delete anything.",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      headline: "Webhooks: lead.created and sale.created fan-out",
      description:
        "Subscribe events to HTTPS endpoints with signed delivery, retries, and a delivery log.",
      author: {
        "@type": "Organization",
        name: "Slugy",
        url: "https://slugy.co",
      },
    },
    {
      "@type": "HowTo",
      name: "How to verify a Slugy webhook signature",
      step: [
        {
          "@type": "HowToStep",
          text: "Read the slugy-timestamp and slugy-signature headers and the raw request body.",
        },
        {
          "@type": "HowToStep",
          text: "Compute HMAC_SHA256(signing secret, timestamp + '.' + rawBody) and compare to the v1= value with a timing-safe comparison.",
        },
        {
          "@type": "HowToStep",
          text: "Reject timestamps older than five minutes to block replays.",
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "/" },
        { "@type": "ListItem", position: 2, name: "Docs", item: "/docs" },
        {
          "@type": "ListItem",
          position: 3,
          name: "Webhooks",
          item: "/docs/webhooks",
        },
      ],
    },
  ],
};

export default function WebhooksDocsPage() {
  return (
    <main className="mt-[65px] min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-10 sm:pt-20 sm:pb-16">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Docs · Webhooks
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
          Webhooks: every lead and sale, fanned out
        </h1>
        <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
          Two events, any HTTPS endpoint, signed deliveries. Step-by-step
          automation walkthrough:{" "}
          <Link
            href="/integrations/zapier"
            className="font-medium underline underline-offset-4"
          >
            Zapier integration
          </Link>
          .
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          How delivery works
        </h2>
        <ul className="mt-6 space-y-3">
          {FACTS.map((t) => (
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
          Verify signatures (Node)
        </h2>
        <pre className="mt-4 overflow-x-auto rounded-lg border bg-zinc-950 p-4 text-[13px] leading-6 text-zinc-100">
          <code>{`import { createHmac, timingSafeEqual } from "crypto";

function verify(req) {
  const ts = req.headers["slugy-timestamp"];
  const sig = req.headers["slugy-signature"]; // v1=<hex>
  const expected =
    "v1=" + createHmac("sha256", SECRET).update(ts + "." + req.rawBody).digest("hex");
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}`}</code>
        </pre>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">
              Add your first webhook
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
