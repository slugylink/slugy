import type { Metadata } from "next";
import BioNotFound from "@/components/web/_bio-links/bio-not-found";

export const metadata: Metadata = {
  title: "Bio Not Found | Slugy",
  description:
    "This bio page doesn't exist. Create your own bio page with Slugy.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BioNotFoundPage() {
  return <BioNotFound />;
}
