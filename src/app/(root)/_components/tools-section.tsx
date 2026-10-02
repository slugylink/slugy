import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Server component: zero client JS, fully crawlable. Links the landing page
// (highest-authority URL) to the free-tool hub and both tools so they collect
// internal link equity — the tools are the no-login top-of-funnel entry.
const TOOLS = [
  {
    href: "/tools/qr-code-generator",
    eyebrow: "No login needed",
    title: "QR Code Generator",
    description:
      "Create custom QR codes for URLs, text, Wi-Fi or email, then download print-ready PNG or SVG. Free, no account required.",
    cta: "Make a QR code",
    span: false,
  },
  {
    href: "/tools/utm-builder",
    eyebrow: "No login needed",
    title: "UTM Builder",
    description:
      "Build validated, GA4-ready campaign URLs with presets for agencies, ecommerce, social and affiliate teams. Free, no account required.",
    cta: "Build a campaign URL",
    span: false,
  },
];

export default function ToolsSection() {
  return (
    <section
      id="free-tools"
      aria-labelledby="free-tools-heading"
      className="mx-auto mt-8 max-w-6xl px-2 py-10 sm:px-4 sm:py-16"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Free tools
        </p>
        <h2
          id="free-tools-heading"
          className="mt-2 text-2xl font-medium text-balance sm:text-4xl"
        >
          Free marketing tools — no login required
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm sm:text-base">
          Shorten later. Start with the tools you need right now — both are free
          and need no signup.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:mt-10 md:grid-cols-2">
        {TOOLS.map((tool) => (
          <div
            key={tool.href}
            className="flex flex-col rounded-[20px] border p-6 sm:p-8"
          >
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              {tool.eyebrow}
            </p>
            <h3 className="mt-2 text-lg font-medium">{tool.title}</h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {tool.description}
            </p>
            <Link
              href={tool.href}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4 hover:opacity-80"
            >
              {tool.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        <Link
          href="/tools"
          className="text-foreground font-medium underline underline-offset-4"
        >
          Browse all free tools
        </Link>
      </p>
    </section>
  );
}
