import type { Metadata } from "next";
import Link from "next/link";
import { QrCode, Link2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Free Marketing Tools — QR Generator & UTM Builder",
  description:
    "Free no-login tools: QR code generator with custom colors and PNG/SVG export, plus a UTM link builder with validation, presets and one-click copy.",
  alternates: { canonical: "/tools" },
  openGraph: { url: "/tools" },
};

const TOOLS = [
  {
    href: "/tools/qr-code-generator",
    icon: QrCode,
    badge: "No login · PNG + SVG",
    title: "QR Code Generator",
    description:
      "Create custom QR codes for URLs, text, Wi-Fi or email. Restyle colors and shapes, then download print-ready PNG or SVG.",
    keywords: "qr code generator · free qr maker · custom qr",
  },
  {
    href: "/tools/utm-builder",
    icon: Link2,
    badge: "No login · GA4 ready",
    title: "UTM Builder",
    description:
      "Build campaign URLs with utm_source, medium, campaign, term and content. Validated, encoded and ready to paste into GA4.",
    keywords: "utm builder · campaign url builder · utm tags",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Free Marketing Tools by Slugy",
  description:
    "Free QR code generator and UTM campaign URL builder. No login required.",
  hasPart: [
    {
      "@type": "SoftwareApplication",
      name: "Slugy QR Code Generator",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      url: "/tools/qr-code-generator",
    },
    {
      "@type": "SoftwareApplication",
      name: "Slugy UTM Builder",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      url: "/tools/utm-builder",
    },
  ],
};

export default function ToolsPage() {
  return (
    <main className="mt-[65px] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-6 text-center sm:pt-16">
        <Badge variant="secondary" className="mb-4">
          Free tools · No login required
        </Badge>
        <h1 className="mx-auto max-w-2xl text-2xl font-medium tracking-tight text-balance sm:text-[32px] sm:leading-[1.15]">
          Free tools for links that get clicked
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-base">
          Two keyword-magnet utilities, embedded right in Slugy. Generate QR
          codes or build UTM-tagged campaign URLs in seconds.
        </p>
      </section>

      <section className="mx-auto grid max-w-4xl gap-4 px-4 pb-16 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group">
            <Card className="h-full gap-3 border-zinc-200 p-6 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md dark:border-white/10">
              <CardContent className="flex flex-col gap-3 p-0">
                <div className="flex items-center justify-between">
                  <span className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                    <tool.icon className="h-5 w-5" />
                  </span>
                  <Badge variant="outline" className="text-[11px]">
                    {tool.badge}
                  </Badge>
                </div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {tool.title}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {tool.description}
                </CardDescription>
                <p className="text-muted-foreground text-xs">{tool.keywords}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-20 text-center">
        <p className="text-muted-foreground text-sm">
          Need branded short links, analytics and workspaces?{" "}
          <Link
            href="https://app.slugy.co"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Get started free
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
