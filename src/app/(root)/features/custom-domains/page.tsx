import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Custom Domain URL Shortener | Slugy",
  description:
    "Create branded short links on your domain. Guided DNS setup (CNAME or apex A record), automatic SSL, and per-link analytics — free to start.",
  keywords: [
    "custom domain URL shortener",
    "branded short links",
    "vanity URL shortener",
    "short links on your own domain",
    "custom domain link management",
  ],
  alternates: { canonical: "/features/custom-domains" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Custom Domain URL Shortener | Slugy",
    description:
      "Branded short links on your domain — guided DNS setup, automatic SSL, analytics on every link.",
    url: "/features/custom-domains",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy custom domains — branded short links on your domain",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom Domain URL Shortener | Slugy",
    description:
      "Branded short links on your domain — guided DNS setup, automatic SSL, analytics on every link.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const STEPS = [
  {
    title: "Add your domain in Slugy",
    body: "Open your workspace → Domains → Add domain and enter it (e.g. go.yourbrand.co or yourbrand.co). Slugy shows the exact DNS records and a verification token.",
  },
  {
    title: "Add the DNS records",
    body: "For a subdomain: one CNAME pointing at cname.vercel-dns.com. For an apex domain: one A record at @ pointing at 76.76.21.21, plus a CNAME for www. Add the _vercel TXT record to verify ownership.",
  },
  {
    title: "Verify and wait for SSL",
    body: "Slugy checks DNS automatically — the domain flips to “Ready to use” once records propagate (usually minutes, up to 24–48h for slow DNS hosts). SSL certificates are issued and renewed automatically.",
  },
  {
    title: "Create branded links",
    body: "Pick your domain when creating any short link. Clicks, leads, and revenue attribute exactly as on the default domain — plus QR codes and bio pages work on it too.",
  },
];

const NOTES = [
  "Included from day one — even the free plan covers a custom domain, unlike vendors that gate it behind Growth tiers.",
  "One SSL pipeline for every domain — issuance and renewal are automatic; there is nothing to rotate by hand.",
  "Migration-safe — import existing slugs via CSV, keep old links live on the previous host until clicks in Slugy match for a week, then cut over.",
  "Parked-domain behavior — an unknown path on your domain shows a branded 404 page, never another site's homepage.",
  "Self-hosting note — automatic domain provisioning uses the Vercel integration; self-hosted instances add DNS and TLS manually (see docs/self-hosting.md).",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Slugy Custom Domains",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "/features/custom-domains",
      description:
        "Branded short links on your own domain with guided DNS setup and automatic SSL.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "HowTo",
      name: "How to add a custom domain to Slugy",
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
          name: "Custom Domains",
          item: "/features/custom-domains",
        },
      ],
    },
  ],
};

export default function CustomDomainsPage() {
  return (
    <main className="mt-[65px] min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-10 text-center sm:pt-20 sm:pb-16">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Feature · Custom domains
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
          Create branded short links on your domain
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-lg">
          Every link looks like{" "}
          <span className="font-medium">yourbrand.co/sale</span> instead of a
          generic shortener — with analytics, QR codes, and{" "}
          <Link
            href="/features/conversion-tracking"
            className="font-medium underline underline-offset-4"
          >
            conversion tracking
          </Link>{" "}
          on every one.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">Add your domain</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">View pricing</Link>
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
        <pre className="mt-8 overflow-x-auto rounded-lg border bg-zinc-950 p-4 text-[13px] leading-6 text-zinc-100">
          <code>{`# Subdomain (e.g. go.yourbrand.co)
CNAME  go     cname.vercel-dns.com

# Apex (e.g. yourbrand.co)
A      @      76.76.21.21
CNAME  www    cname.vercel-dns.com
TXT    _vercel  <verification token from the app>`}</code>
        </pre>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          What to know before you switch
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
        <p className="text-muted-foreground mt-6 text-sm leading-7">
          Moving from Bitly? The full path is{" "}
          <Link
            href="/alternative/bitly"
            className="font-medium underline underline-offset-4"
          >
            export → connect domain → import
          </Link>
          . Comparing against Dub.co?{" "}
          <Link
            href="/blogs/slugy-vs-dub"
            className="font-medium underline underline-offset-4"
          >
            Read the honest tradeoff list
          </Link>
          .
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 text-center sm:py-16">
        <h2 className="text-2xl font-medium text-balance sm:text-4xl">
          Your links, your domain, your data
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-base">
          Free to start, no credit card. Branded links, QR codes, and click
          analytics from day one — leads and revenue when you upgrade.
        </p>
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
