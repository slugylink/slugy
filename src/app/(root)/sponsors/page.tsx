import type { Metadata } from "next";
import SponsorsPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Sponsors",
  description:
    "Meet the sponsors and supporters behind Slugy, the open-source URL shortener. Learn how companies help us build better link management tools.",
  alternates: { canonical: "/sponsors" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Sponsors | Slugy",
    description:
      "Meet the sponsors and supporters behind Slugy, the open-source URL shortener.",
    url: "/sponsors",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Sponsors behind Slugy",
      },
    ],
  },
  twitter: {
    title: "Sponsors | Slugy",
    description:
      "Meet the sponsors and supporters behind Slugy, the open-source URL shortener.",
    card: "summary_large_image",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

export default function SponsorsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Sponsors | Slugy",
    description:
      "Meet the sponsors and supporters behind Slugy, the open-source URL shortener.",
    url: "/sponsors",
    mainEntity: { "@type": "Organization", name: "Slugy" },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SponsorsPageClient />
    </>
  );
}
