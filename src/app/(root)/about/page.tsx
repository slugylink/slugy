import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Slugy — Open-Source Link Analytics",
  description:
    "Slugy is an open-source link management platform — branded short links, analytics, QR codes, and link-in-bio, built in the open.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "About Slugy — Open-Source Link Analytics | Slugy",
    description:
      "Slugy is an open-source link management platform — branded short links, analytics, QR codes, and link-in-bio.",
    url: "/about",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "About Slugy — open-source link management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Slugy — Open-Source Link Analytics | Slugy",
    description:
      "Slugy is an open-source link management platform — branded short links, analytics, QR codes, and link-in-bio.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "slugy.co";
const BASE_URL = `https://${ROOT_DOMAIN}`;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Slugy",
  url: `${BASE_URL}/about`,
  mainEntity: { "@id": `${BASE_URL}/#organization` },
};

export default function AboutPage() {
  return (
    <main className="mx-auto mt-[120px] min-h-[50vh] w-full max-w-3xl px-4 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-10 border-b pb-8">
        <h1 className="text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          About Slugy
        </h1>
        <p className="text-muted-foreground mt-4 text-base leading-7 sm:text-lg">
          Short links with powerful analytics — without the enterprise price
          tag.
        </p>
      </header>

      <div className="space-y-8 text-sm leading-7 sm:text-base">
        <section>
          <h2 className="text-xl font-medium">What Slugy is</h2>
          <p className="text-muted-foreground mt-3">
            Slugy is a link management platform: branded short links, click and
            conversion analytics, QR codes, link-in-bio pages, custom domains,
            UTM tooling, and team workspaces. It is built for developers,
            marketers, creators, and small teams who want the important parts of
            a link platform without enterprise pricing.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium">Open source</h2>
          <p className="text-muted-foreground mt-3">
            The codebase is public. You can review how links are stored, how
            clicks are counted, and how analytics are aggregated — no black
            boxes. Live platform totals are published on the{" "}
            <Link href="/" className="underline underline-offset-4">
              home page
            </Link>
            .
          </p>
          <p className="text-muted-foreground mt-3">
            <a
              href="https://github.com/slugylink/slugy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              github.com/slugylink/slugy
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium">What we offer</h2>
          <ul className="text-muted-foreground mt-3 list-disc space-y-1.5 pl-5">
            <li>Branded short links with custom domains and SSL</li>
            <li>
              Click, lead, and sales analytics with shareable client reports
            </li>
            <li>QR codes with custom styling and PNG/SVG export</li>
            <li>Link-in-bio pages</li>
            <li>Free no-login tools: QR code generator and UTM Builder</li>
          </ul>
          <p className="text-muted-foreground mt-3">
            See{" "}
            <Link href="/pricing" className="underline underline-offset-4">
              pricing
            </Link>{" "}
            for plan limits.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium">Contact</h2>
          <p className="text-muted-foreground mt-3">
            Questions, feedback, or bug reports:{" "}
            <a
              href="https://github.com/slugylink/slugy/discussions/categories/feedback"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              open a discussion on GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
