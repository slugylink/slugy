import { Metadata } from "next";

export const metadata: Metadata = {
  // Primary metadata
  title: {
    default: "Slugy - Simplify Links Like Magic",
    template: "%s | Slugy",
  },
  description:
    "Transform long URLs into beautiful, trackable short links with Slugy. Open-source URL shortener with analytics, link-in-bio pages, custom domains, and team collaboration. Better than Bitly.",

  // Enhanced keywords for better SEO
  keywords: [
    "URL shortener",
    "short links",
    "link management",
    "link analytics",
    "link-in-bio",
    "custom domains",
    "open source",
    "bitly alternative",
    "dub alternative",
    "tinyurl alternative",
    "link tracking",
    "QR codes",
    "branded links",
    "team collaboration",
    "link monitoring",
  ].join(", "),

  // Author and publication info
  authors: [
    { name: "Slugy Team", url: "https://slugy.co/" },
    { name: "Sandip Sarkar", url: "https://sandipsarkar.dev/" },
  ],
  creator: "Slugy Team",
  publisher: "Slugy",
  category: "Technology",

  // Technical metadata
  viewport: "width=device-width, initial-scale=1.0, viewport-fit=cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  colorScheme: "light dark",

  // Enhanced robots configuration
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Comprehensive icon configuration
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#000000" },
    ],
  },

  // Web app manifest
  manifest: "/site.webmanifest",

  // Enhanced Open Graph
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Slugy - Simplify Links Like Magic",
    description:
      "Transform long URLs into beautiful, trackable short links. Open-source platform with analytics, link-in-bio pages, custom domains, and team collaboration.",
    url: "https://slugy.co/",
    locale: "en_US",
    alternateLocale: ["en_GB", "en_CA"],
    images: [
      {
        url: "https://opengraph.b-cdn.net/production/images/0ce10001-2b82-4aa0-8ea0-dd81a5d4f3c9.png?token=QDDzSWuUwEWwkS7QJQowUAgJlPFSc7Bsxl4zOUPQ9Ao&height=630&width=1200&expires=33283747365",
        width: 1200,
        height: 630,
        alt: "Slugy - Open Source URL Shortener Platform",
        type: "image/png",
      },
      {
        url: "https://slugy.co/og-square.png",
        width: 400,
        height: 400,
        alt: "Slugy Logo",
        type: "image/png",
      },
    ],
  },

  // Enhanced Twitter Card
  twitter: {
    card: "summary_large_image",
    site: "@slugy",
    creator: "@sandip_dev_07",
    title: "Slugy – Simplify Links Like Magic",
    description:
      "Transform long URLs into beautiful, trackable short links. Open-source platform with analytics, link-in-bio pages, and custom domains.",
    images: {
      url: "https://opengraph.b-cdn.net/production/images/0ce10001-2b82-4aa0-8ea0-dd81a5d4f3c9.png?token=QDDzSWuUwEWwkS7QJQowUAgJlPFSc7Bsxl4zOUPQ9Ao&height=630&width=1200&expires=33283747365",
      alt: "Slugy - Open Source URL Shortener Platform",
      width: 1200,
      height: 630,
    },
  },

  // Canonical and alternate URLs
  alternates: {
    canonical: "https://slugy.co/",
    languages: {
      "en-US": "https://slugy.co/",
      "en-GB": "https://slugy.co/en-gb",
    },
  },

  // App-specific metadata
  applicationName: "Slugy",
  referrer: "origin-when-cross-origin",

  // Additional structured data hints
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Slugy",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#000000",
    "msapplication-config": "/browserconfig.xml",
  },
};
