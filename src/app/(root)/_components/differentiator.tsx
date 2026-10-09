import Link from "next/link";
import { Check } from "lucide-react";

const POINTS = [
  {
    title: "Attribution from $8/mo, not $90/mo",
    body: "Lead tracking on Pro, revenue attribution on Growth — the same job Dub.co gates behind Business.",
    href: "/features/conversion-tracking",
    cta: "How tracking works",
  },
  {
    title: "Custom domains from day one",
    body: "Branded links on your domain with automatic SSL — included from free, not a Growth upsell.",
    href: "/features/custom-domains",
    cta: "Set up a domain",
  },
  {
    title: "Open source (MIT), self-hostable",
    body: "Public codebase with documented self-hosting — no black boxes, no AGPL constraints.",
    href: "/docs/self-hosting",
    cta: "Self-hosting guide",
  },
];

export default function Differentiator() {
  return (
    <section
      aria-labelledby="why-slugy-heading"
      className="mx-auto max-w-6xl px-4 py-10 sm:py-16"
    >
      <div className="rounded-[20px] border bg-white p-6 sm:p-10 dark:bg-zinc-950">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Why Slugy
        </p>
        <h2
          id="why-slugy-heading"
          className="mt-2 text-2xl font-medium tracking-tight text-balance sm:text-3xl"
        >
          The short version for switchers
        </h2>
        <ul className="mt-8 grid gap-8 md:grid-cols-3">
          {POINTS.map((point) => (
            <li key={point.title}>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600/10">
                <Check className="h-5 w-5 text-green-600" />
              </span>
              <p className="mt-3 font-medium">{point.title}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                {point.body}{" "}
                <Link
                  href={point.href}
                  className="text-foreground font-medium underline underline-offset-4"
                >
                  {point.cta}
                </Link>
              </p>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-8 text-center text-sm">
          Want numbers?{" "}
          <Link
            href="/alternative"
            className="text-foreground font-medium underline underline-offset-4"
          >
            Compare Slugy against Bitly and Dub.co
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
