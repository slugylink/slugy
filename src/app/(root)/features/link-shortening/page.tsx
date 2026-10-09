import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Branded Link Shortening with QR Codes | Slugy",
  description:
    "Shorten links on your brand with custom slugs, QR codes, link expiration, and password protection. Free to start — 10 links/month, no credit card.",
  keywords: [
    "link shortening",
    "branded link shortener",
    "custom slug short links",
    "short links with password protection",
    "short links with expiration",
  ],
  alternates: { canonical: "/features/link-shortening" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Branded Link Shortening with QR Codes | Slugy",
    description:
      "Custom slugs, QR codes, expiration, and password protection — free to start.",
    url: "/features/link-shortening",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy link shortening — branded short links with QR codes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Branded Link Shortening with QR Codes | Slugy",
    description:
      "Custom slugs, QR codes, expiration, and password protection — free to start.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const CAPABILITIES = [
  {
    title: "Custom slugs",
    body: "Pick memorable endings (yourbrand.co/launch) instead of random strings. Slugs are validated and collision-checked at creation.",
  },
  {
    title: "QR code with every link",
    body: "Generate a scannable QR for any short link with custom colors and print-ready PNG/SVG export — or start free with the standalone QR generator.",
  },
  {
    title: "Link expiration (Pro and up)",
    body: "Set an expiry date for time-boxed campaigns. Expired links land on a dedicated expired page — or a fallback URL you choose — never a confusing homepage.",
  },
  {
    title: "Password protection (Pro and up)",
    body: "Gate sensitive links behind a password. Guesses are verified server-side, and password-gate URLs are never indexed by search engines.",
  },
  {
    title: "Geo targeting (Pro and up)",
    body: "Send visitors to different destinations by country from a single short link — one QR on global packaging, local landing pages behind it.",
  },
];

const LIMITS = [
  "Free covers 10 new links/month and 1k tracked clicks/month across 1 workspace — expiration, passwords, and geo targeting need Pro.",
  "Pro raises this to 250 links/month and 10k clicks; Growth to 1,500 links/month and 50k clicks with bulk creation.",
  "Deleted links free the slug subject to availability — treat high-traffic slugs as permanent once shared in print.",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Slugy Link Shortening",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "/features/link-shortening",
      description:
        "Branded short links with custom slugs, QR codes, expiration, and password protection.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "HowTo",
      name: "How to create a branded short link",
      step: [
        { "@type": "HowToStep", text: "Paste the destination URL." },
        {
          "@type": "HowToStep",
          text: "Pick a custom slug and domain, then optionally set expiry or a password (Pro).",
        },
        {
          "@type": "HowToStep",
          text: "Share the link or its QR code; track performance per link.",
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Features",
          item: "/features",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Link Shortening",
          item: "/features/link-shortening",
        },
      ],
    },
  ],
};

export default function LinkShorteningPage() {
  return (
    <main className="mt-[65px] min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-10 text-center sm:pt-20 sm:pb-16">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Feature · Link shortening
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
          Shorten links on your brand
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-lg">
          Custom slugs, QR codes, expiration, and passwords — short links that
          carry your domain and your rules.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">
              Shorten your first link free
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/features/custom-domains">Add your domain</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          What every short link includes
        </h2>
        <div className="mt-8 space-y-8">
          {CAPABILITIES.map((c) => (
            <div key={c.title}>
              <p className="font-medium">{c.title}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-7">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Plan limits, stated plainly
        </h2>
        <ul className="mt-6 space-y-3">
          {LIMITS.map((t) => (
            <li
              key={t}
              className="flex items-start gap-2.5 text-sm sm:text-base"
            >
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-6 text-sm leading-7">
          Every plan — including free — gets click analytics and{" "}
          <Link
            href="/features/analytics"
            className="font-medium underline underline-offset-4"
          >
            per-link reporting
          </Link>
          . Full numbers on{" "}
          <Link
            href="/pricing"
            className="font-medium underline underline-offset-4"
          >
            pricing
          </Link>
          .
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 text-center sm:py-16">
        <h2 className="text-2xl font-medium text-balance sm:text-4xl">
          Stop sharing raw URLs
        </h2>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">
              Create your first branded link
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
