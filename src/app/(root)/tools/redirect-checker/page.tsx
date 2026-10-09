import type { Metadata } from "next";
import RedirectCheckerClient from "./checker-client";

export const metadata: Metadata = {
  title: "Free URL Checker — Redirects, Status Codes & Link Health",
  description:
    "Free URL checker with no login. Check any link's destination, trace its full redirect chain (301, 302, 307) up to 10 hops, and verify short links land where they should.",
  keywords: [
    "url checker",
    "free url checker",
    "check url destination",
    "link health check",
    "is this link safe",
    "redirect checker",
    "trace redirects",
    "where does this link go",
  ],
  alternates: { canonical: "/tools/redirect-checker" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Free URL Checker — Destination, Hops & Link Health",
    description:
      "Check any link's destination and redirect chain with status codes. Verify short links and campaign URLs. No login.",
    url: "/tools/redirect-checker",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy free redirect checker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free URL Checker — Redirects, Status Codes & Link Health",
    description:
      "Check any link's destination and redirect chain with status codes. Verify short links and campaign URLs. No login.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const FAQ = [
  {
    q: "What does a redirect checker show?",
    a: "Every hop a URL takes: each intermediate address with its HTTP status (301 permanent, 302 temporary, 307, and so on) up to the final landing page — up to 10 hops.",
  },
  {
    q: "Why check redirects before sharing a link?",
    a: "Long chains slow down visitors, dilute SEO equity, and sometimes land somewhere unexpected. Affiliate and shortened links especially deserve a trace before they go into ads, emails, or QR codes.",
  },
  {
    q: "Is a 301 or 302 better for short links?",
    a: "A 301 (permanent) tells search engines the short URL permanently represents the destination; a 302 (temporary) keeps ranking signals on the short URL itself. Slugy uses 302 so your analytics keep counting on the short link.",
  },
  {
    q: "Can I preview where a short link goes?",
    a: "Yes — paste any shortened URL here to see its destination without visiting it. Private and local addresses are never fetched.",
  },
  {
    q: "Does this tell me if a link is safe or malicious?",
    a: "It shows you the destination without visiting it — so a suspicious link can't drive-by load anything in your browser — and it never fetches private or local addresses or downloads response bodies. That is link transparency, not a malware verdict: for unknown senders, preview here first and verify the sender before clicking through.",
  },
  {
    q: "Do you store the URLs I check?",
    a: "No. Checks run on demand and only the status plus Location headers are read — response bodies are never downloaded and nothing is logged.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Slugy URL Checker",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      url: "/tools/redirect-checker",
      description:
        "Free URL checker: destination preview, redirect chain tracer with HTTP status codes, and link-health basics. No login required.",
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@type": "HowTo",
      name: "How to trace a redirect chain",
      step: [
        { "@type": "HowToStep", text: "Paste the link you want to inspect." },
        {
          "@type": "HowToStep",
          text: "Run the trace to follow up to 10 hops.",
        },
        {
          "@type": "HowToStep",
          text: "Review each status code and copy the final URL.",
        },
      ],
    },
  ],
};

export default function RedirectCheckerPage() {
  return (
    <main className="mt-[65px] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RedirectCheckerClient />
      <section className="mx-auto max-w-3xl px-4 pt-4 pb-2">
        <h2 className="text-xl font-medium">
          When should you check a redirect chain?
        </h2>
        <p className="text-muted-foreground mt-3 text-sm leading-7">
          Trace any shortened or affiliate link before it goes into ads, emails,
          or QR codes: long chains slow down visitors, dilute SEO equity, and
          occasionally land somewhere unexpected. A clean short link resolves in
          one hop with its campaign tags forwarded intact — which is exactly
          what Slugy short links do. If a chain looks wrong, rebuild the
          destination with the{" "}
          <a
            href="/tools/utm-builder"
            className="font-medium underline underline-offset-4"
          >
            UTM builder
          </a>{" "}
          and re-shorten it.
        </p>
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-16">
        <h2 className="text-xl font-medium">
          Beyond a basic checker: what Slugy links add
        </h2>
        <p className="text-muted-foreground mt-3 text-sm leading-7">
          Standard checkers stop at hops and codes. A Slugy short link keeps
          going: every click records referrer, country, device, and UTM
          breakdowns, and on Pro and Growth the same link attributes{" "}
          <a
            href="/features/conversion-tracking"
            className="font-medium underline underline-offset-4"
          >
            leads and revenue
          </a>
          . Check a chain here, then{" "}
          <a
            href="https://app.slugy.co/signup"
            className="font-medium underline underline-offset-4"
          >
            shorten and track it free
          </a>{" "}
          so the next check comes with analytics attached.
        </p>
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-16">
        <h2 className="text-xl font-medium">URL checker FAQ</h2>
        <div className="mt-4 space-y-4">
          {FAQ.map((f) => (
            <div key={f.q}>
              <h3 className="text-base font-medium">{f.q}</h3>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {f.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
