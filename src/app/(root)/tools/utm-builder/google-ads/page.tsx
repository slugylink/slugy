import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PlatformUtmPage from "../platform-page";
import { getPlatformPage } from "../platforms";

const page = getPlatformPage("google-ads")!;

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
        alt: "Slugy UTM builder",
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

export default function GoogleAdsUtmPage() {
  const data = getPlatformPage("google-ads");
  if (!data) notFound();
  return <PlatformUtmPage page={data} />;
}
