import type { Metadata } from "next";
import PricingPageClient from "./page-client";
import PricingFaq from "./faq-section";
import { FREE_PLAN, PRO_PLAN, GROWTH_PLAN } from "@/constants/data/price";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple pricing for Slugy — URL shortener plans with analytics, bio links, custom domains, and team collaboration. Start free.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing | Slugy",
    description:
      "Simple pricing for Slugy — URL shortener plans with analytics, bio links, and custom domains.",
    url: "/pricing",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing | Slugy",
    description:
      "Simple pricing for Slugy — URL shortener plans with analytics, bio links, and custom domains.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "slugy.co";
const BASE_URL = `https://${ROOT_DOMAIN}`;

// Product + Offer markup built from the same plan constants the UI
// renders, so structured data can never drift from displayed prices.
const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Slugy",
  description:
    "Open-source link management platform: branded short links, analytics, QR codes, link-in-bio, custom domains, and team collaboration.",
  brand: { "@type": "Brand", name: "Slugy" },
  url: `${BASE_URL}/pricing`,
  offers: [FREE_PLAN, PRO_PLAN, GROWTH_PLAN].map((plan) => ({
    "@type": "Offer",
    name: `Slugy ${plan.name}`,
    priceCurrency: "USD",
    price: plan.monthlyPrice,
    availability: "https://schema.org/InStock",
    url: `${BASE_URL}/pricing`,
  })),
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <PricingPageClient />
      <PricingFaq />
    </>
  );
}
