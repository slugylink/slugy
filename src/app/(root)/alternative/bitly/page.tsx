import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import CompareTable from "../../_components/compare-table";
import Faq from "../../_components/faq";

export const metadata: Metadata = {
  title: "Slugy vs Bitly: branded links without enterprise pricing",
  description:
    "Compare Slugy vs Bitly on free plans, custom domains, QR codes, bio pages, and conversion tracking — plus how to migrate via CSV.",
  alternates: { canonical: "/alternative/bitly" },
  openGraph: {
    title: "Slugy vs Bitly | Slugy",
    description:
      "Branded links, QR codes, bio pages, and conversion tracking — without enterprise pricing.",
    url: "/alternative/bitly",
  },
};

const SWITCH_REASONS = [
  "Custom domain from day one — Bitly gates branded domains behind its $29/mo Growth tier",
  "Bio pages and lead conversion tracking included, not separate products",
  "Free plan with no credit card, backed by an open-source codebase",
];

const STEPS = [
  {
    title: "Export from Bitly",
    body: "Download your links as a CSV — slugs, destinations, and UTMs come with you.",
  },
  {
    title: "Connect your domain",
    body: "Point your custom domain at Slugy with the guided DNS setup, in minutes.",
  },
  {
    title: "Import and go",
    body: "Upload the CSV to Slugy. Links, QR codes, and analytics start working immediately.",
  },
];

export default function BitlyAlternativePage() {
  return (
    <main className="mt-[65px] min-h-screen overflow-x-hidden">
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-10 text-center sm:pt-20 sm:pb-16">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Bitly alternative
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
          Everything Bitly does, without the enterprise price tag
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-lg">
          Branded links, QR codes, bio pages, and conversion tracking — free to
          start, open source, no sales call.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">Switch to Slugy free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">View pricing</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Why teams switch from Bitly
        </h2>
        <ul className="mt-6 space-y-3">
          {SWITCH_REASONS.map((r) => (
            <li
              key={r}
              className="flex items-start gap-2.5 text-sm sm:text-base"
            >
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        <h2 className="text-center text-2xl font-medium tracking-tight text-balance sm:text-3xl">
          Slugy vs Bitly vs Dub.co
        </h2>
        <div className="mt-8 rounded-[20px] border bg-white p-4 sm:p-6 dark:bg-zinc-950">
          <CompareTable />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Migrate in three steps
        </h2>
        <ol className="mt-6 space-y-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="bg-foreground text-background flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">Start your migration</Link>
          </Button>
        </div>
      </section>

      <Faq />

      <section className="mx-auto max-w-6xl px-4 pt-4 pb-16 text-center sm:pb-20">
        <h2 className="text-2xl font-medium text-balance sm:text-4xl">
          Ready to leave per-link limits behind?
        </h2>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="https://app.slugy.co/signup">
              Create your first campaign link
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
