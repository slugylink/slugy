import { Reveal, Stagger, StaggerItem } from "./reveal";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Server-rendered content with shared client animation wrappers. Links the landing page
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
      className="mx-auto max-w-6xl px-2 py-10 sm:px-4 sm:py-12"
    >
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Free tools
        </p>
        <h2
          id="free-tools-heading"
          className="mt-2 text-2xl font-medium text-balance sm:text-4xl"
        >
          Just need a quick tool?
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm sm:text-base">
          Create a QR code or build a campaign URL. Free, with no signup.
        </p>
      </Reveal>

      <Stagger className="mt-8 grid grid-cols-1 gap-6 sm:mt-10 md:grid-cols-2">
        {TOOLS.map((tool) => (
          <StaggerItem
            key={tool.href}
            className="flex flex-col rounded-[20px] border p-5 sm:p-6"
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
              className="text-foreground mt-5 inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70"
            >
              {tool.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
