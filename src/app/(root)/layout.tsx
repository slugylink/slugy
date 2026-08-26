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
      name: "Slugy",
      url: BASE_URL,
      logo: `${BASE_URL}/web-app-manifest-512x512.png`,
      sameAs: [
        "https://github.com/slugylink/slugy",
        "https://x.com/slugydotco",
      ],
    },
    {
      "@type": "SoftwareApplication",
      name: "Slugy",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: BASE_URL,
      description:
        "Open-source URL shortener with advanced analytics, link-in-bio pages, custom domains, and team collaboration.",
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
