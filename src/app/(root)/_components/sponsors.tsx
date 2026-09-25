"use client";

import Image from "next/image";
import { Reveal } from "./reveal";

const sponsors = [
  {
    name: "Neon",
    icon: "/icons/neon-logo.webp",
    link: "https://neon.tech",
  },
];

export default function Sponsors() {
  return (
    <section className="border-y border-zinc-200/70 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/30">
      <Reveal className="mx-auto max-w-6xl px-4 py-10 text-center sm:py-16">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Supported by
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {sponsors.map((sponsor) => (
            <a
              key={sponsor.name}
              href={sponsor.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={sponsor.name}
              className="opacity-70 transition-opacity hover:opacity-100"
            >
              <Image
                src={sponsor.icon}
                alt={`${sponsor.name} logo`}
                width={140}
                height={44}
                className="h-9 w-auto object-contain grayscale"
              />
            </a>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
