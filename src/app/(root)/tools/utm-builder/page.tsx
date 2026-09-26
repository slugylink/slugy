import type { Metadata } from "next";
import UtmBuilderClient from "./utm-builder-client";

export const metadata: Metadata = {
  title: "Free UTM Builder — Campaign URL Builder for GA4",
  description:
    "Free UTM link builder with no login. Add utm_source, utm_medium, campaign, term and content with validation, presets, encoding and one-click copy.",
  keywords: [
    "utm builder",
    "campaign url builder",
    "utm generator",
    "utm parameters",
    "google analytics utm",
    "utm_source medium campaign",
  ],
  alternates: { canonical: "/tools/utm-builder" },
  openGraph: {
    title: "Free UTM Builder — Campaign URL Builder for GA4",
    description:
      "Build clean, validated campaign URLs in seconds. Presets, encoding and copy included — no login.",
    url: "/tools/utm-builder",
  },
};

const FAQ = [
  {
    q: "What are UTM parameters?",
    a: "UTMs are query tags (utm_source, utm_medium, utm_campaign, utm_term, utm_content) appended to a URL so Google Analytics can attribute traffic to the exact post, ad or email that drove it.",
  },
  {
    q: "Which UTMs are required?",
    a: "Only utm_source, utm_medium and utm_campaign are required for clean GA4 reports. Term tracks paid keywords, content distinguishes A/B variants of the same placement.",
  },
  {
    q: "Should I use uppercase or spaces in UTMs?",
    a: "No. GA4 treats UTMs as case-sensitive, so 'Email' and 'email' split into two rows. Use lowercase, hyphens instead of spaces — this builder enforces that automatically.",
  },
  {
    q: "Will UTMs break my URL?",
    a: "Not when encoded correctly. This builder percent-encodes values, preserves existing query strings and fragments (#), and validates the base URL before generating.",
  },
  {
    q: "How do I keep UTM naming consistent across my team?",
    a: "Agree on a short list of sources (e.g. newsletter, linkedin, google) and mediums (email, social, cpc). Use the presets here, then shorten the final URL with Slugy so long campaign links never appear in public.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Slugy UTM Builder",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      url: "/tools/utm-builder",
      description:
        "Free campaign URL builder with UTM validation, presets and one-click copy. No login required.",
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
      name: "How to build a UTM-tagged URL",
      step: [
        { "@type": "HowToStep", text: "Paste your destination URL." },
        {
          "@type": "HowToStep",
          text: "Fill source, medium and campaign (plus term/content if needed).",
        },
        {
          "@type": "HowToStep",
          text: "Copy the validated, encoded campaign link.",
        },
      ],
    },
  ],
};

export default function UtmBuilderPage() {
  return (
    <main className="mt-[65px] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <UtmBuilderClient faqs={FAQ} />
    </main>
  );
}
