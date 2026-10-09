import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Self-Hosting Docs — Requirements & Setup | Slugy",
  description:
    "Self-host Slugy: mandatory services (Postgres, Redis), optional integrations (Tinybird, Resend, Polar, R2, Vercel), local quickstart, and production checklist.",
  alternates: { canonical: "/docs/self-hosting" },
  openGraph: {
    type: "website",
    siteName: "Slugy",
    title: "Self-Hosting Docs — Requirements & Setup | Slugy",
    description:
      "Mandatory vs optional services, local quickstart, and production checklist for self-hosted Slugy.",
    url: "/docs/self-hosting",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy self-hosting documentation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Self-Hosting Docs — Requirements & Setup | Slugy",
    description:
      "Mandatory vs optional services, local quickstart, and production checklist.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const MANDATORY = [
  "Node.js 20+ — Next.js 16 runtime.",
  "Postgres 17+ (or Neon) + DATABASE_URL — primary store for links, workspaces, users.",
  "BETTER_AUTH_SECRET — 32+ random characters for session signing.",
  "Upstash Redis (REST URL + token) — link cache, rate limits, analytics batching. Without it every click hits Postgres and rate limiting is disabled.",
  "NEXT_PUBLIC_ROOT_DOMAIN + NEXT_PUBLIC_APP_URL — routing between site and app subdomain (localhost:3000 / app.localhost:3000 locally).",
];

const OPTIONAL = [
  "Tinybird — realtime click-event pipeline; without it the dashboard falls back to Postgres counters.",
  "Resend — transactional email; without it use direct DB user creation for local testing.",
  "Polar — subscriptions; without it all workspaces behave as free and lead/revenue tracking stays gated.",
  "Cloudflare R2 — avatar/OG uploads; links work without it.",
  "Vercel integration — automatic custom-domain provisioning; otherwise add DNS/TLS manually per domain.",
  "Inngest / QStash — background jobs and cron backfills.",
  "Gemini / Groq API keys — AI slug suggestions and analytics Ask AI.",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      headline: "Self-Hosting Slugy: Requirements & Setup",
      description:
        "Mandatory vs optional services, local quickstart, and production checklist.",
      author: {
        "@type": "Organization",
        name: "Slugy",
        url: "https://slugy.co",
      },
    },
    {
      "@type": "HowTo",
      name: "How to run Slugy locally",
      step: [
        {
          "@type": "HowToStep",
          text: "Clone, install, and start local Postgres via docker compose up -d (local database only, not a production deploy).",
        },
        {
          "@type": "HowToStep",
          text: "Copy .env.example to .env.local and fill in DATABASE_URL, BETTER_AUTH_SECRET, and Redis credentials.",
        },
        {
          "@type": "HowToStep",
          text: "Run npx prisma generate, npm run db:push, then npm run dev. Open localhost:3000 and app.localhost:3000.",
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "/" },
        { "@type": "ListItem", position: 2, name: "Docs", item: "/docs" },
        {
          "@type": "ListItem",
          position: 3,
          name: "Self-Hosting",
          item: "/docs/self-hosting",
        },
      ],
    },
  ],
};

export default function SelfHostingDocsPage() {
  return (
    <main className="mt-[65px] min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-10 sm:pt-20 sm:pb-16">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Docs · Self-hosting
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
          Self-host Slugy: requirements & setup
        </h1>
        <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
          Community-supported. Core link management runs with a database plus
          Redis; every other service degrades gracefully or needs an account.
          MIT-licensed — commercial self-hosting included, unlike AGPL
          alternatives.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Mandatory
        </h2>
        <ul className="mt-6 space-y-3">
          {MANDATORY.map((t) => (
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

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Optional — feature degrades without it
        </h2>
        <ul className="mt-6 space-y-3">
          {OPTIONAL.map((t) => (
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

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Local quickstart
        </h2>
        <pre className="mt-4 overflow-x-auto rounded-lg border bg-zinc-950 p-4 text-[13px] leading-6 text-zinc-100">
          <code>{`git clone https://github.com/slugylink/slugy.git
cd slugy && npm install
docker compose up -d        # local Postgres only
cp .env.example .env.local  # fill DATABASE_URL, secrets, Redis
npx prisma generate && npm run db:push
npm run dev                 # :3000 + app.localhost:3000`}</code>
        </pre>
        <p className="text-muted-foreground mt-4 text-sm leading-7">
          Verify: create a link, open it incognito (expect a 302), open a bogus
          slug (expect a true 404 page, not the homepage). Production checklist
          — managed Postgres with backups, managed Redis with TLS, wildcard TLS
          for custom domains, CRON_SECRET set, dedicated
          LINK_PASSWORD_COOKIE_SECRET — plus the full matrix in{" "}
          <Link
            href="https://github.com/slugylink/slugy/blob/main/docs/self-hosting.md"
            className="font-medium underline underline-offset-4"
          >
            docs/self-hosting.md
          </Link>
          .
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="https://github.com/slugylink/slugy">View the repo</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
