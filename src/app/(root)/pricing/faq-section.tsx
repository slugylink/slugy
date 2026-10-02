import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQS, faqJsonLd } from "@/content/faq";

// Visible FAQ on /pricing so the FAQPage JSON-LD below matches on-page
// content (search guidelines ignore markup with no visible counterpart).
// Q/A pairs are shared with the landing-page FAQ via src/content/faq.
export default function PricingFaq() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-4 pb-14 sm:pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          FAQ
        </p>
        <h2 className="mt-2 text-2xl font-medium text-balance sm:text-4xl">
          Pricing questions, answered
        </h2>
      </div>
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
    </section>
  );
}
