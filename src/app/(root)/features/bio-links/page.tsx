import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Link-in-Bio Pages on Your Domain | Slugy",
  description:
    "One bio page for every link — hosted on bio.slugy.co or your own domain, with per-link click stats. 5 bio links free, up to 30 on Growth.",
  keywords: [
    "link in bio page",
    "bio links page",
    "linktree alternative open source",
    "bio page on custom domain",
    "creator bio links",
  ],
  alternates: { canonical: "/features/bio-links" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Link-in-Bio Pages on Your Domain | Slugy",
    description:
      "One page for every link — on bio.slugy.co or your own domain, with click stats per link.",
    url: "/features/bio-links",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy bio links — one page for every link",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Link-in-Bio Pages on Your Domain | Slugy",
    description:
      "One page for every link — on bio.slugy.co or your own domain, with click stats per link.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const STEPS = [
  {
    title: "Claim your handle",
    body: "Pick a username — your page lives at bio.slugy.co/yourname, or point it at your own domain for a fully branded page.",
  },
  {
    title: "Add links",
    body: "Add short links with titles and thumbnails. Reorder anytime; changes publish instantly with no rebuild.",
  },
  {
    title: "Share one URL",
    body: "Put the single bio URL in your social profiles, video descriptions, and email signature instead of rotating individual links.",
  },
  {
    title: "Read per-link stats",
    body: "Every tap on a bio link records a click against that link — compare which placements earn attention and prune the rest.",
  },
];

const NOTES = [
  "Free includes 5 links per bio page; Pro raises this to 10, Growth to 30.",
  "Short links inside a bio page keep full analytics, QR codes, and attribution — a bio tap followed by a purchase attributes like any other click.",
  "Bio galleries on the root domain (/b/:username) are canonicalized to bio.slugy.co so search equity consolidates instead of splitting.",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Slugy Bio Links",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "/features/bio-links",
      description:
        "Link-in-bio pages on bio.slugy.co or your own domain, with per-link click stats.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "HowTo",
      name: "How to set up a Slugy bio page",
      step: STEPS.map((s) => ({
        "@type": "HowToStep",
        text: `${s.title}: ${s.body}`,
      })),
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
          name: "Bio Links",
          item: "/features/bio-links",
        },
      ],
    },
  ],
};

export default function BioLinksPage() {
  return (
    <main className="mt-[65px] min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-10 text-center sm:pt-20 sm:pb-16">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Feature · Bio links
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
          One page for every link
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-lg">
          A link-in-bio page on{" "}
          <span className="font-medium">bio.slugy.co</span> or your own domain —
          with click stats on every link inside it.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">
              Claim your bio page free
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/features/custom-domains">Use your own domain</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Set up in four steps
        </h2>
        <ol className="mt-8 space-y-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="bg-foreground text-background flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-7">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          What to know
        </h2>
        <ul className="mt-6 space-y-3">
          {NOTES.map((t) => (
            <li
              key={t}
              className="flex items-start gap-2.5 text-sm sm:text-base"
            >
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 text-center sm:py-16">
        <h2 className="text-2xl font-medium text-balance sm:text-4xl">
          Link once, update forever
        </h2>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">Create your bio page</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
