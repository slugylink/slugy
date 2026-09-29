import type { Metadata, Viewport } from "next";

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "slugy.co")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

const IS_LOCAL = ROOT_DOMAIN.startsWith("localhost");
const BASE_URL = `${IS_LOCAL ? "http" : "https"}://${ROOT_DOMAIN}`;

// PNG/JPG at 1200x630 has the best scraper compatibility
const OG_IMAGE_URL = "https://files.slugy.co/slugy-og.png";

const TITLE = "Slugy - Short Links with Powerful Analytics";
const DESCRIPTION =
  "The open-source link management platform for developers. Branded links, analytics, QR codes and link-in-bio — without the enterprise price tag.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: TITLE,
    template: "%s | Slugy",
  },
  description: DESCRIPTION,
  applicationName: "Slugy",
  authors: [
    { name: "Slugy Team", url: BASE_URL },
    { name: "Sandip Sarkar", url: "https://imsandip.in/" },
  ],
  creator: "Slugy Team",
  publisher: "Slugy",
  category: "Technology",
  referrer: "origin-when-cross-origin",
  keywords: [
    "URL shortener",
    "short links",
    "link management",
    "link analytics",
    "link-in-bio",
    "custom domains",
    "open source URL shortener",
    "QR code generator",
    "branded links",
  ],
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
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Slugy",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: "Slugy - Short Links with Powerful Analytics",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@slugydotco",
    creator: "@slugydotco",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      { url: OG_IMAGE_URL, alt: "Slugy - Short Links with Powerful Analytics" },
    ],
  },
};
