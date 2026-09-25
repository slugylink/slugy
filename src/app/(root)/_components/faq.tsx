import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "./reveal";

const FAQS = [
  {
    q: "Can I migrate from Bitly?",
    a: "Yes. Export your links from Bitly as a CSV and import them into Slugy — your slugs, destinations, and UTM parameters come with you. Most teams finish in minutes.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. Connect a custom domain in minutes with guided DNS setup, so every link looks like yourbrand.co/sale instead of a generic shortener. See pricing for plan limits.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The free plan covers branded links, QR codes, and basic analytics — no credit card required. Upgrade only when you need more links, domains, or history.",
  },
  {
    q: "Do QR codes cost extra?",
    a: "No. Every short link includes a print-ready QR code you can restyle to match your brand — posters, packaging, and events included.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel in one click from your billing settings — no calls, no emails, no retention flow.",
  },
  {
    q: "Is Slugy open source?",
    a: "Yes. The codebase is public on GitHub, and live platform totals are published on this page. No black boxes.",
  },
] as const;

export default function Faq() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          FAQ
        </p>
        <h2 className="mt-2 text-2xl font-medium text-balance sm:text-4xl">
          Questions, answered
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm sm:text-base">
          Migration, domains, pricing — the objections everyone asks about.
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <Accordion type="single" collapsible className="mt-8">
          {FAQS.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left text-base hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}
