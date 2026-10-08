import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Integrate Zapier with Slugy — Automate Leads & Sales",
  description:
    "Step-by-step guide to integrate Zapier with Slugy: forward lead.created and sale.created webhooks to a catch hook, verify signatures, and trigger 7,000+ app workflows.",
  keywords: [
    "Zapier URL shortener integration",
    "integrate Zapier with short links",
    "lead webhook Zapier",
    "sale webhook automation",
    "Slugy Zapier guide",
  ],
  alternates: { canonical: "/integrations/zapier" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Integrating Slugy with Zapier — Step-by-Step Guide",
    description:
      "Trigger 7,000+ app workflows on every lead or sale. Signed webhooks, no glue code.",
    url: "/integrations/zapier",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy Zapier integration — automate leads and sales",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Integrating Slugy with Zapier — Step-by-Step Guide",
    description: "Trigger 7,000+ app workflows on every lead or sale.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const STEPS = [
  {
    title: "Create a Zap with a Catch Hook trigger",
    body: "In Zapier, create a new Zap → Trigger: Webhooks by Zapier → Catch Hook. Copy the custom webhook URL (https://hooks.zapier.com/hooks/catch/…). Keep the “find data” test window open — you will send a test event from Slugy in step 3.",
  },
  {
    title: "Add the webhook in Slugy",
    body: "Open Settings → Integrations → Webhooks → Add webhook. Paste the Zapier catch-hook URL, select lead.created and (on Growth) sale.created, and copy the signing secret shown once. Leave the endpoint enabled. If you need per-campaign routing, add one webhook per Zap and filter by slug downstream.",
  },
  {
    title: "Send a test and map fields",
    body: "Click Send test on the webhook card, then return to Zapier → Test trigger. You should see a payload with event, workspaceId, createdAt, and data { slug, clickId, customerEmail, saleAmount, saleCurrency }. Map customerEmail to your CRM, saleAmount to Sheets, slug to a digest — every field is plain JSON.",
  },
  {
    title: "Add actions and go live",
    body: "Common stacks: add a row to Google Sheets for every lead, create/update a HubSpot or Salesforce contact, send a Slack DM for sales over $100, or delay + email a review request. Turn the Zap on. Failed deliveries stay visible in Slugy for debugging; old ones are purged automatically.",
  },
];

const FAQS = [
  {
    q: "Do I need code for the Zapier integration?",
    a: "No. It is a plain outbound webhook — paste the catch-hook URL into Slugy and map JSON fields in Zapier. Signature verification is optional unless you forward to your own server first.",
  },
  {
    q: "How do I verify webhook signatures?",
    a: "Compute HMAC_SHA256(secret, timestamp + '.' + rawBody) and compare to the slugy-signature header (v1=…). Reject timestamps older than five minutes to block replays.",
  },
  {
    q: "Which plan do I need?",
    a: "lead.created needs Pro; sale.created with revenue fields needs Growth. Webhook configuration itself is available on all workspaces — events simply do not fire until the plan unlocks them.",
  },
  {
    q: "Zapier vs Make vs Segment?",
    a: "Same webhook powers all three. Use Zapier for 7,000+ app coverage, Make for visual branching scenarios, or Segment to stream lead and sale events into your warehouse. You can attach all three endpoints at once.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "HowTo",
      name: "How to integrate Zapier with Slugy",
      description:
        "Forward lead and sale events to a Zapier catch hook and trigger automations.",
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
          name: "Zapier",
          item: "/integrations/zapier",
        },
      ],
    },
  ],
};

export default function ZapierIntegrationPage() {
  return (
    <main className="mt-[65px] min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-10 text-center sm:pt-20 sm:pb-16">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Integration · Zapier
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
          Integrate Zapier with Slugy: automate every lead and sale
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-lg">
          Forward signed webhooks to a catch hook and trigger 7,000+ app
          workflows — CRM, Sheets, email, Slack — with no glue code.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">Automate free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/blogs/slugy-integrations">Webhook reference</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Setup in four steps
        </h2>
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
          Example delivery
        </h2>
        <pre className="mt-4 overflow-x-auto rounded-lg border bg-zinc-950 p-4 text-[13px] leading-6 text-zinc-100">
          <code>{`POST https://hooks.zapier.com/hooks/catch/… HTTP/1.1
slugy-timestamp: 1728123456
slugy-signature: v1=9f2c…
content-type: application/json

{
  "event": "lead.created",
  "workspaceId": "ws_…",
  "createdAt": "2026-10-05T…Z",
  "data": {
    "slug": "launch",
    "clickId": "clk_…",
    "customerEmail": "buyer@example.com",
    "saleAmount": 49,
    "saleCurrency": "USD"
  }
}`}</code>
        </pre>
        <ul className="mt-6 space-y-3">
          {[
            "Filter in Zapier by event or slug — one webhook can feed many Zaps via Paths.",
            "Pause the endpoint with the toggle in Slugy when debugging; no need to delete the Zap.",
            "Need Make or Segment too? Add more webhook URLs — events fan out to every endpoint.",
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
            <Link href="https://app.slugy.co/signup">Connect Zapier</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/integrations">All integrations</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
