import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { cn } from "@/lib/utils";
import { Providers } from "./provider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";

export { metadata } from "./metadata";

const inter = Inter({
  variable: "--font-inter",
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
      className={cn(inter.variable, "scroll-smooth")}
    >
      <head>
        <link rel="preconnect" href="https://fonts.cdnfonts.com" />
        <link
          rel="preload"
          href="https://fonts.cdnfonts.com/css/satoshi"
          as="style"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.cdnfonts.com/css/satoshi"
          />
        </noscript>
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body>
        <Script id="satoshi-font" strategy="afterInteractive">
          {`(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.cdnfonts.com/css/satoshi';document.head.appendChild(l);})();`}
        </Script>
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
