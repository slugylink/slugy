// Single source of truth for public FAQs. Used by the landing-page FAQ
// section (visible content + FAQPage JSON-LD) and the pricing page
// (visible FAQ section + FAQPage JSON-LD). Keep answers in sync with the
// actual product — answer engines quote these verbatim.
export const FAQS = [
  {
    q: "Can I migrate from Bitly?",
    a: "Yes. Export your links from Bitly as a CSV and import them into Slugy — your slugs, destinations, and UTM parameters come with you. Most teams finish in minutes.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. Connect a custom domain in minutes with guided DNS setup, so every link looks like yourbrand.co/sale instead of a generic shortener. See pricing for plan limits.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The free plan covers branded links, QR codes, and basic analytics — no credit card required. Upgrade only when you need more links, domains, or history.",
  },
  {
    q: "Do QR codes cost extra?",
    a: "No. Every short link includes a print-ready QR code you can restyle to match your brand — posters, packaging, and events included.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel in one click from your billing settings — no calls, no emails, no retention flow.",
  },
  {
    q: "Is Slugy open source?",
    a: "Yes. The codebase is public on GitHub, and live platform totals are published on this page. No black boxes.",
  },
] as const;

export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
