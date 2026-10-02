import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PlatformUtmPage from "../platform-page";
import { getPlatformPage } from "../platforms";

const page = getPlatformPage("facebook")!;

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  keywords: page.keywords,
  alternates: { canonical: `/tools/utm-builder/${page.slug}` },
  openGraph: {
    title: page.title,
    description: page.description,
    url: `/tools/utm-builder/${page.slug}`,
  },
};

export default function MetaUtmPage() {
  const data = getPlatformPage("facebook");
  if (!data) notFound();
  return <PlatformUtmPage page={data} />;
}
