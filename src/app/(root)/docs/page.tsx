import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Code2, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Documentation — Self-Hosting, Conversions & Webhooks | Slugy",
  description:
    "Slugy docs: self-hosting requirements, lead and revenue conversion tracking API, and signed webhooks for Zapier, Make, and Segment.",
  alternates: { canonical: "/docs" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Documentation — Self-Hosting, Conversions & Webhooks | Slugy",
    description:
      "Self-hosting requirements, conversion tracking API, and signed webhooks.",
    url: "/docs",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy documentation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Documentation — Self-Hosting, Conversions & Webhooks | Slugy",
    description:
      "Self-hosting requirements, conversion tracking API, and signed webhooks.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const GUIDES = [
  {
    href: "/docs/self-hosting",
    icon: BookOpen,
    badge: "Community-supported",
    title: "Self-Hosting",
    description:
      "Mandatory vs optional services, local quickstart, production checklist, and support boundaries.",
    keywords: "self-host · docker · requirements",
  },
  {
    href: "/docs/conversions",
    icon: Code2,
    badge: "Pro + Growth",
    title: "Conversion Tracking API",
    description:
      "POST /api/leads_track reference: auth, fields, 200/201/404/422/429 responses, idempotency, and the 90-day attribution window.",
    keywords: "leads_track · API reference · attribution",
  },
  {
    href: "/docs/webhooks",
    icon: Webhook,
    badge: "All plans",
    title: "Webhooks",
    description:
      "lead.created and sale.created fan-out, signed delivery format, HMAC verification snippet, and retries.",
    keywords: "webhooks · zapier · HMAC signatures",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Slugy Documentation",
  description:
    "Self-hosting requirements, conversion tracking API, and signed webhooks.",
  hasPart: GUIDES.map((g) => ({
    "@type": "TechArticle",
    name: `Slugy ${g.title}`,
    url: g.href,
  })),
};

export default function DocsPage() {
  return (
    <main className="mt-[65px] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-6 text-center sm:pt-16">
        <Badge variant="secondary" className="mb-4">
          Docs
        </Badge>
        <h1 className="mx-auto max-w-2xl text-2xl font-medium tracking-tight text-balance sm:text-[32px] sm:leading-[1.15]">
          Slugy documentation
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-base">
          Three guides to start. Product walkthroughs live under{" "}
          <Link
            href="/features/conversion-tracking"
            className="font-medium underline underline-offset-4"
          >
            features
          </Link>{" "}
          and{" "}
          <Link
            href="/integrations"
            className="font-medium underline underline-offset-4"
          >
            integrations
          </Link>
          .
        </p>
      </section>

      <section className="mx-auto grid max-w-4xl gap-4 px-4 pb-16 sm:grid-cols-3">
        {GUIDES.map((guide) => (
          <Link key={guide.href} href={guide.href} className="group">
            <Card className="h-full gap-3 border-zinc-200 p-6 transition-all group-hover:shadow-md dark:border-white/10">
              <CardContent className="flex flex-col gap-3 p-0">
                <div className="flex items-center justify-between">
                  <span className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                    <guide.icon className="h-5 w-5" />
                  </span>
                  <Badge variant="outline" className="text-[11px]">
                    {guide.badge}
                  </Badge>
                </div>
                <h2 className="flex items-center gap-2 text-lg leading-none font-medium">
                  {guide.title}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </h2>
                <CardDescription className="text-sm leading-relaxed">
                  {guide.description}
                </CardDescription>
                <p className="text-muted-foreground text-xs">
                  {guide.keywords}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-20 text-center">
        <p className="text-muted-foreground text-sm">
          Stuck? Ask in{" "}
          <Link
            href="https://github.com/slugylink/slugy/discussions"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            GitHub Discussions
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
