import React from "react";
import Footer from "./_components/footer";
import Navbar from "./_components/navbar";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "slugy.co";
const BASE_URL = `https://${ROOT_DOMAIN}`;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "Slugy",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/android-chrome-512x512.png`,
      },
      sameAs: [
        "https://github.com/slugylink/slugy",
        "https://x.com/slugydotco",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "Slugy",
      publisher: { "@id": `${BASE_URL}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "SoftwareApplication",
      name: "Slugy",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Link Management",
      operatingSystem: "Web",
      url: BASE_URL,
      description:
        "Open-source URL shortener with advanced analytics, link-in-bio pages, custom domains, and team collaboration.",
      isAccessibleForFree: true,
      screenshot: "https://files.slugy.co/slugy-og.png",
      featureList: [
        "Branded short links",
        "Click, lead, and sales analytics",
        "QR code generator",
        "Link-in-bio pages",
        "Custom domains with SSL",
        "UTM Builder",
        "CSV link import and export",
        "Team workspaces",
      ],
      offers: {
        "@type": "Offer",
        url: `${BASE_URL}/pricing`,
        priceCurrency: "USD",
        price: "0",
      },
    },
  ],
};

const HomeLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="h-full flex-col bg-white dark:bg-[#121212]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <div className="">{children}</div>
      <Footer />
    </main>
  );
};

export default HomeLayout;
