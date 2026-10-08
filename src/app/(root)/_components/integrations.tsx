import { Reveal, Stagger, StaggerItem } from "./reveal";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { brandFor } from "@/lib/integrations/branding";

// Server-rendered content with shared client animation wrappers. Mirrors the workspace
// integrations catalog so marketing and product never drift apart.
const INTEGRATIONS: Array<{
  provider: string;
  name: string;
  description: string;
}> = [
  {
    provider: "slack",
    name: "Slack",
    description: "Lead and sale alerts plus /shorten without leaving chat.",
  },
  {
    provider: "zapier",
    name: "Zapier",
    description: "Trigger 7,000+ app workflows on every lead or sale.",
  },
  {
    provider: "make",
    name: "Make",
    description: "Route link events through 2,000+ visual scenarios.",
  },
  {
    provider: "polar",
    name: "Polar",
    description: "Attribute orders to the clicks that drove them.",
  },
  {
    provider: "shopify",
    name: "Shopify",
    description: "Tie store revenue back to the short links behind it.",
  },
  {
    provider: "wordpress",
    name: "WordPress",
    description: "Auto-shorten every post link the moment you publish.",
  },
  {
    provider: "stripe",
    name: "Stripe",
    description: "Attribute checkouts to the links that drove them.",
  },
  {
    provider: "segment",
    name: "Segment",
    description: "Stream lead and sale events into your warehouse.",
  },
];

export default function IntegrationsSection() {
  return (
    <section
      id="integrations"
      aria-labelledby="integrations-heading"
      className="mx-auto mt-8 max-w-6xl scroll-mt-20 px-2 py-10 sm:px-4 sm:py-16"
    >
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Integrations
        </p>
        <h2
          id="integrations-heading"
          className="mt-2 text-2xl font-medium text-balance sm:text-4xl"
        >
          Plugs into the stack you already run
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm sm:text-base">
          Notifications where your team works, automation without glue code, and
          revenue attribution for the checkouts that matter.
        </p>
      </Reveal>

      <Stagger className="mt-8 grid grid-cols-2 gap-4 sm:mt-10 lg:grid-cols-4">
        {INTEGRATIONS.map(({ provider, name, description }) => {
          const brand = brandFor(provider);
          return (
            <StaggerItem
              key={name}
              className="flex flex-col rounded-[20px] border p-5 sm:p-6"
            >
              <div className="bg-muted flex h-9 w-9 items-center justify-center rounded-md">
                {brand.src ? (
                  <Image
                    src={brand.src}
                    alt=""
                    width={16}
                    height={16}
                    className={brand.invertOnDark ? "dark:invert" : undefined}
                  />
                ) : (
                  brand.Icon && <brand.Icon className="h-4 w-4" aria-hidden />
                )}
              </div>
              <h3 className="mt-3 text-sm font-medium">{name}</h3>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed sm:text-sm">
                {description}
              </p>
            </StaggerItem>
          );
        })}
      </Stagger>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        <Link
          href="/integrations"
          className="text-foreground inline-flex items-center gap-1 font-medium underline underline-offset-4"
        >
          See the setup guides <ArrowRight className="h-4 w-4" />
        </Link>
        <span className="mx-2" aria-hidden>
          ·
        </span>
        <Link
          href="/integrations/shopify"
          className="text-foreground inline-flex items-center gap-1 font-medium underline underline-offset-4"
        >
          Shopify guide
        </Link>
        <span className="mx-2" aria-hidden>
          ·
        </span>
        <Link
          href="/integrations/zapier"
          className="text-foreground inline-flex items-center gap-1 font-medium underline underline-offset-4"
        >
          Zapier guide
        </Link>
      </p>
    </section>
  );
}
