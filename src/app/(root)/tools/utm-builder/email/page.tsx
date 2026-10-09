import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PlatformUtmPage from "../platform-page";
import { getPlatformPage } from "../platforms";

const page = getPlatformPage("email")!;

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  keywords: page.keywords,
  alternates: { canonical: `/tools/utm-builder/${page.slug}` },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: page.title,
    description: page.description,
    url: `/tools/utm-builder/${page.slug}`,
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy email UTM builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: page.title,
    description: page.description,
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

export default function EmailUtmPage() {
  const data = getPlatformPage("email");
  if (!data) notFound();
  return <PlatformUtmPage page={data} />;
}
