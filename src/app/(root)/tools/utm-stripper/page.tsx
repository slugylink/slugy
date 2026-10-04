import type { Metadata } from "next";
import UtmStripperClient from "./stripper-client";

export const metadata: Metadata = {
  title: "Free UTM Stripper — Remove UTM Parameters & Click IDs",
  description:
    "Free UTM remover with no login. Strip utm_source, medium, campaign, term, content and ad click IDs (gclid, fbclid) from any URL — runs privately in your browser.",
  keywords: [
    "utm stripper",
    "remove utm parameters",
    "url cleaner",
    "strip utm tags",
    "remove gclid fbclid",
    "clean tracking parameters",
  ],
  alternates: { canonical: "/tools/utm-stripper" },
  openGraph: {
    title: "Free UTM Stripper — Clean URLs in One Click",
    description:
      "Remove UTM parameters and ad click IDs from any URL. Private, instant, no login.",
    url: "/tools/utm-stripper",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy free UTM stripper",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free UTM Stripper — Remove UTM Parameters & Click IDs",
    description:
      "Remove UTM parameters and ad click IDs from any URL. Private, instant, no login.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const FAQ = [
  {
    q: "What does a UTM stripper do?",
    a: "It removes tracking query tags — utm_source, utm_medium, utm_campaign, utm_term, utm_content — plus ad click IDs like gclid and fbclid, leaving the clean destination URL behind.",
  },
  {
    q: "When should I strip UTMs instead of adding them?",
    a: "Strip before sharing a link publicly or re-tagging a campaign: old tags would otherwise pollute your new reports. Build fresh tags afterwards with a UTM builder so every click attributes correctly.",
  },
  {
    q: "Does this tool upload my URLs anywhere?",
    a: "No. Stripping runs entirely in your browser with JavaScript — the URL you paste never leaves this page, and nothing is stored.",
  },
  {
    q: "Which parameters are removed?",
    a: "The five standard UTM tags plus common ad click IDs: gclid, gbraid, wbraid, fbclid, msclkid, dclid, ttclid, li_fat_id, mc_cid, mc_eid, igshid and mkt_tok. Everything else in the URL is preserved, including fragments.",
  },
  {
    q: "Will stripping break the link?",
    a: "No. Tracking tags are metadata for analytics — the page, product, or article loads identically without them.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Slugy UTM Stripper",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      url: "/tools/utm-stripper",
      description:
        "Free UTM parameter and ad click ID remover. Runs privately in the browser, no login required.",
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
      name: "How to strip UTM parameters from a URL",
      step: [
        { "@type": "HowToStep", text: "Paste the tagged URL." },
        {
          "@type": "HowToStep",
          text: "Choose UTM tags, ad click IDs, or both to remove.",
        },
        { "@type": "HowToStep", text: "Copy the clean URL." },
      ],
    },
  ],
};

export default function UtmStripperPage() {
  return (
    <main className="mt-[65px] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <UtmStripperClient />
      <section className="mx-auto max-w-3xl px-4 pb-16">
        <h2 className="text-xl font-medium">UTM stripper FAQ</h2>
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
