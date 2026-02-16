import { Metadata } from "next";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "slugy.co";
const BASE_URL = `https://${ROOT_DOMAIN}`;
const OG_IMAGE_URL =
  "https://res.cloudinary.com/dcsouj6ix/image/upload/v1771156577/slugy-meta-img_pjaerq.png";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Slugy - Open Source URL Shortener with Advanced Analytics",
    template: "%s | Slugy",
  },
  description:
    "Transform long URLs into beautiful, trackable short links with Slugy. Open-source URL shortener with advanced analytics, link-in-bio pages, custom domains, and team collaboration.",
  keywords: [
    "URL shortener",
    "short links",
    "link management",
    "link analytics",
    "link-in-bio",
    "custom domains",
    "open source URL shortener",
    "bitly alternative",
    "dub alternative",
    "tinyurl alternative",
    "link tracking",
    "QR code generator",
    "branded links",
    "team collaboration",
  ],
  authors: [
    { name: "Slugy Team", url: BASE_URL },
    { name: "Sandip Sarkar", url: "https://sandipsarkar.dev/" },
  ],
  creator: "Slugy Team",
  publisher: "Slugy",
  applicationName: "Slugy",
  category: "Technology",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      {
        url: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Slugy",
    title: "Slugy - Open Source URL Shortener with Advanced Analytics",
    description:
      "Transform long URLs into beautiful, trackable short links. Open-source platform with analytics, link-in-bio pages, custom domains, and team collaboration.",
    locale: "en_US",
    images: [
      {
        url: OG_IMAGE_URL,
        alt: "Slugy - Open Source URL Shortener",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@slugy",
    creator: "@sandip_dev_07",
    title: "Slugy - Open Source URL Shortener with Advanced Analytics",
    description:
      "Transform long URLs into beautiful, trackable short links. Open-source platform with analytics, link-in-bio pages, and custom domains.",
    images: [OG_IMAGE_URL],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Slugy",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#000000",
  },
};
