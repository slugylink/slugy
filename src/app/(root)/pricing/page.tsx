import type { Metadata } from "next";
import PricingPageClient from "./page-client";

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
    title: "Pricing | Slugy",
    description:
      "Simple pricing for Slugy — URL shortener plans with analytics, bio links, and custom domains.",
  },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
