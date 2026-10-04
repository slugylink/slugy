import type { Metadata } from "next";
import Navbar from "../(root)/_components/navbar";
import Footer from "../(root)/_components/footer";

export const metadata: Metadata = {
  title: "Custom Domain - Powered by Slugy",
  description:
    "Connect a custom domain to Slugy for branded short links with automatic SSL, guided DNS setup, and link analytics.",
  alternates: { canonical: "/custom-domain" },
  openGraph: {
    title: "Custom Domain - Powered by Slugy",
    description:
      "Connect a custom domain to Slugy for branded short links with automatic SSL and analytics.",
    url: "/custom-domain",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy custom domains for branded short links",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom Domain - Powered by Slugy",
    description:
      "Connect a custom domain to Slugy for branded short links with automatic SSL and analytics.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

export default function CustomDomainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      {children} <Footer />
    </>
  );
}
