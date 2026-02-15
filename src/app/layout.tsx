import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { cn } from "@/lib/utils";
import { Providers } from "./provider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
export { metadata } from "./metadata";

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
