import type { Metadata } from "next";
import Link from "next/link";
import {
  Target,
  Globe,
  ArrowRight,
  Link2,
  ChartNoAxesColumn,
  FolderOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Features — Conversion Tracking & Custom Domains | Slugy",
  description:
    "Explore Slugy features: link conversion tracking for leads and revenue, plus branded short links on your own custom domain.",
  alternates: { canonical: "/features" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Features — Conversion Tracking & Custom Domains | Slugy",
    description:
      "Link conversion tracking for leads and revenue, plus branded short links on your custom domain.",
    url: "/features",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy features — conversion tracking and custom domains",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Features — Conversion Tracking & Custom Domains | Slugy",
    description:
      "Link conversion tracking for leads and revenue, plus branded short links on your custom domain.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const FEATURES = [
  {
    href: "/features/link-shortening",
    icon: Link2,
    badge: "Free to start",
    title: "Link Shortening",
    description:
      "Custom slugs, QR codes, expiration, and password protection — short links that carry your brand.",
    keywords: "link shortening · custom slugs · QR codes",
  },
  {
    href: "/features/analytics",
    icon: ChartNoAxesColumn,
    badge: "Free to start",
    title: "Advanced Analytics",
    description:
      "Clicks, referrers, countries, devices, and UTM breakdowns per link — bots filtered out.",
    keywords: "link analytics · click tracking · UTM reports",
  },
  {
    href: "/features/bio-links",
    icon: FolderOpen,
    badge: "5 links free",
    title: "Bio Links",
    description:
      "One page for every link — on bio.slugy.co or your own domain, with click stats per link.",
    keywords: "link in bio · bio page · creator links",
  },
  {
    href: "/features/conversion-tracking",
    icon: Target,
    badge: "Pro + Growth",
    title: "Conversion Tracking",
    description:
      "See which short links generate leads and revenue — click ID lifecycle, setup example, plan requirements, and honest attribution limits.",
    keywords:
      "link conversion tracking · lead attribution · revenue attribution",
  },
  {
    href: "/features/custom-domains",
    icon: Globe,
    badge: "Free to start",
    title: "Custom Domains",
    description:
      "Branded short links on your domain — guided DNS setup, automatic SSL, and safe migration from Bitly or Dub.co.",
    keywords: "custom domain shortener · branded links · vanity URLs",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Slugy Features",
  description:
    "Link conversion tracking for leads and revenue, plus branded short links on custom domains.",
  hasPart: FEATURES.map((f) => ({
    "@type": "SoftwareApplication",
    name: `Slugy ${f.title}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: f.href,
  })),
};

export default function FeaturesPage() {
  return (
    <main className="mt-[65px] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-6 text-center sm:pt-16">
        <Badge variant="secondary" className="mb-4">
          Features
        </Badge>
        <h1 className="mx-auto max-w-2xl text-2xl font-medium tracking-tight text-balance sm:text-[32px] sm:leading-[1.15]">
          Links that prove their value
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-base">
          Track which campaigns generate signups and sales — on links branded
          with your own domain.
        </p>
      </section>

      <section className="mx-auto grid max-w-4xl gap-4 px-4 pb-16 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <Link key={feature.href} href={feature.href} className="group">
            <Card className="h-full gap-3 border-zinc-200 p-6 transition-all group-hover:shadow-md dark:border-white/10">
              <CardContent className="flex flex-col gap-3 p-0">
                <div className="flex items-center justify-between">
                  <span className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <Badge variant="outline" className="text-[11px]">
                    {feature.badge}
                  </Badge>
                </div>
                <h2 className="flex items-center gap-2 text-lg leading-none font-medium">
                  {feature.title}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </h2>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
                <p className="text-muted-foreground text-xs">
                  {feature.keywords}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-20 text-center">
        <p className="text-muted-foreground text-sm">
          Looking for apps that connect?{" "}
          <Link
            href="/integrations"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Browse integrations
          </Link>{" "}
          or{" "}
          <Link
            href="https://app.slugy.co/signup"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            start free
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
