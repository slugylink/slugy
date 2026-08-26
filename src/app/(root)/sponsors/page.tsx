import type { Metadata } from "next";
import SponsorsPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Sponsors",
  description:
    "Meet the sponsors and supporters behind Slugy, the open-source URL shortener. Learn how companies help us build better link management tools.",
  alternates: { canonical: "/sponsors" },
  openGraph: {
    title: "Sponsors | Slugy",
    description:
      "Meet the sponsors and supporters behind Slugy, the open-source URL shortener.",
    url: "/sponsors",
  },
  twitter: {
    title: "Sponsors | Slugy",
    description:
      "Meet the sponsors and supporters behind Slugy, the open-source URL shortener.",
  },
};

export default function SponsorsPage() {
  return <SponsorsPageClient />;
}
