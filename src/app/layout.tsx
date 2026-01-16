import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { cn } from "@/lib/utils";
import { Providers } from "./provider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
import { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: true,
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: true,
  display: "swap",
});

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
    { name: "Sandip Sarkar", url: "https://slugy.co/" },
    { name: "Sandip Sarkar", url: "https://sandipsarkar.dev/" },
  ],
  creator: "Slugy Team",
  publisher: "Slugy",
  category: "Technology",
  // Comprehensive icon configuration
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
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#000000" },
    ],
  },

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
        url: "https://files.slugy.co/slugy.png",
        width: 1139,
        height: 712,
        alt: "Slugy - Open Source URL Shortener Platform",
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
      url: "https://files.slugy.co/slugy.png",
      alt: "Slugy - Open Source URL Shortener Platform",
      width: 1139,
      height: 712,
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

  // Additional structured data hints
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Slugy",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#000000",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(geistSans.variable, geistMono.variable)}
    >
      <head>
        {/* Preconnect to external domains for better performance */}
        <link rel="preconnect" href="https://assets.sandipsarkar.dev" />
        <link rel="preconnect" href="https://api.producthunt.com" />
        <link rel="dns-prefetch" href="https://assets.sandipsarkar.dev" />
        <link rel="dns-prefetch" href="https://api.producthunt.com" />
      </head>
      <body>
        <NuqsAdapter>
          <Providers>
            {children}
            <Toaster />
            <SpeedInsights />
            <Analytics />
          </Providers>
        </NuqsAdapter>
      </body>
    </html>
  );
}
