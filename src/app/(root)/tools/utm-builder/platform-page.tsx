import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import UtmBuilderClient from "./utm-builder-client";
import { PLATFORM_PRESETS, type PlatformPage } from "./platforms";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "slugy.co";
const BASE_URL = `https://${ROOT_DOMAIN}`;

/**
 * Renders one dedicated platform page: unique guidance, a builder seeded with
 * that platform's conventions, and platform-specific FAQ/structured data.
 * Content lives in platforms.ts so the chips and pages stay in sync.
 */
export default function PlatformUtmPage({ page }: { page: PlatformPage }) {
  const preset = PLATFORM_PRESETS.find((p) => p.slug === page.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: `Slugy UTM Builder — ${page.heading}`,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web",
        isAccessibleForFree: true,
        url: `${BASE_URL}/tools/utm-builder/${page.slug}`,
        description: page.description,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "HowTo",
        name: `How to build a ${page.name} campaign URL`,
        step: [
          { "@type": "HowToStep", text: "Paste your destination URL." },
          {
            "@type": "HowToStep",
            text: `Apply the ${page.name} preset or enter your campaign name.`,
          },
          {
            "@type": "HowToStep",
            text: "Copy the validated, encoded campaign URL.",
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Tools",
            item: `${BASE_URL}/tools`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "UTM Builder",
            item: `${BASE_URL}/tools/utm-builder`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: page.name,
            item: `${BASE_URL}/tools/utm-builder/${page.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <main className="mt-[65px] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="mx-auto max-w-5xl px-4 pt-10 sm:pt-14">
        <h1 className="text-2xl leading-[1.15] font-medium tracking-tight text-balance sm:text-[32px]">
          {page.heading}
        </h1>
        <p className="text-muted-foreground mt-2.5 max-w-2xl text-[15px] leading-relaxed">
          {page.intro}
        </p>
      </section>

      <UtmBuilderClient
        faqs={page.faq}
        hideHero
        platformKey={preset?.key ?? null}
        initialValues={preset?.values}
      />

      {/* Parameter conventions */}
      <section className="mx-auto max-w-5xl px-4 pb-12">
        <div className="bg-card overflow-hidden rounded-2xl border">
          <div className="border-b px-5 py-4 sm:px-6">
            <h2 className="text-[15px] font-medium">
              {page.name} UTM conventions
            </h2>
            <p className="text-muted-foreground mt-0.5 text-[13px]">
              What to put in each parameter for this platform.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-[11px] tracking-wide uppercase">
                  <th className="px-5 py-2.5 font-medium sm:px-6">Parameter</th>
                  <th className="py-2.5 pr-4 font-medium">Value</th>
                  <th className="py-2.5 pr-5 font-medium sm:pr-6">Why</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {page.convention.map((row) => (
                  <tr key={row.param} className="border-b last:border-0">
                    <td className="text-foreground px-5 py-2.5 font-mono text-xs sm:px-6">
                      {row.param}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {row.value}
                    </td>
                    <td className="py-2.5 pr-5 text-[13px] leading-relaxed sm:pr-6">
                      {row.why}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Examples */}
      <section className="mx-auto max-w-5xl px-4 pb-12">
        <h2 className="text-xl font-medium">
          {page.name} campaign URL examples
        </h2>
        <div className="mt-4 space-y-3">
          {page.examples.map((ex) => (
            <div key={ex.url} className="rounded-xl border p-4">
              <p className="text-[13px] font-medium">{ex.label}</p>
              <code className="text-muted-foreground mt-2 block text-xs break-all">
                {ex.url}
              </code>
            </div>
          ))}
        </div>
      </section>

      {/* Platform notes */}
      <section className="mx-auto max-w-3xl px-4 pb-12">
        <h2 className="text-xl font-medium">{page.name} tracking notes</h2>
        <div className="mt-4 space-y-5">
          {page.notes.map((note) => (
            <div key={note.heading}>
              <h3 className="text-base font-medium">{note.heading}</h3>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {note.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-12">
        <h2 className="text-xl font-medium">{page.name} UTM FAQ</h2>
        <Accordion type="single" collapsible className="mt-4">
          {page.faq.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left text-[15px] hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Other platforms */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <h2 className="text-sm font-medium">Other platform guides</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLATFORM_PRESETS.filter((p) => p.slug !== page.slug).map((p) => (
            <Link
              key={p.slug}
              href={`/tools/utm-builder/${p.slug}`}
              className="hover:border-foreground/30 rounded-lg border px-3 py-1.5 text-sm transition-colors"
            >
              {p.name} UTM Builder
            </Link>
          ))}
          <Link
            href="/tools/utm-builder"
            className="hover:border-foreground/30 rounded-lg border px-3 py-1.5 text-sm transition-colors"
          >
            All-purpose UTM Builder
          </Link>
        </div>
      </section>
    </main>
  );
}
