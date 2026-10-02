import type { Metadata } from "next";
import RedirectCheckerClient from "./checker-client";

export const metadata: Metadata = {
  title: "Free Redirect Checker — Trace Every Hop & Status Code",
  description:
    "Free redirect checker with no login. Trace any link's full redirect chain (301, 302, 307) up to 10 hops and verify short links land where they should.",
  keywords: [
    "redirect checker",
    "link redirect checker",
    "trace redirects",
    "check 301 redirect chain",
    "short link preview",
    "where does this link go",
  ],
  alternates: { canonical: "/tools/redirect-checker" },
  openGraph: {
    title: "Free Redirect Checker — See Every Hop",
    description:
      "Trace any link's redirect chain with status codes. Verify short links and campaign URLs. No login.",
    url: "/tools/redirect-checker",
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
    q: "Do you store the URLs I check?",
    a: "No. Checks run on demand and only the status plus Location headers are read — response bodies are never downloaded and nothing is logged.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Slugy Redirect Checker",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      url: "/tools/redirect-checker",
      description:
        "Free redirect chain tracer with HTTP status codes. No login required.",
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
      <section className="mx-auto max-w-3xl px-4 pb-16">
        <h2 className="text-xl font-medium">Redirect checker FAQ</h2>
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
