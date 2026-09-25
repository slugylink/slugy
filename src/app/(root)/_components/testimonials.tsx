"use client";
import { memo } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "./reveal";

// TODO: replace quotes with real customer words and set each `image`
// to the customer's photo (e.g. "/images/testimonials/priya.jpg").
const TESTIMONIALS = [
  {
    quote:
      "Slugy replaced three tools for us — short links, QR codes, and client reporting now live in one place.",
    name: "Priya N.",
    role: "Marketing Lead, digital agency",
    initials: "PN",
    image: "",
  },
  {
    quote:
      "The analytics finally show us which channels actually drive clicks. The shared reports alone are worth it.",
    name: "Daniel O.",
    role: "Founder, SaaS startup",
    initials: "DO",
    image: "",
  },
  {
    quote:
      "Setup took minutes: custom domain, branded links, and QR codes for our event posters the same afternoon.",
    name: "Sofia M.",
    role: "Content Creator",
    initials: "SM",
    image: "",
  },
];

const Testimonials = memo(function Testimonials() {
  return (
    <div className="mx-auto max-w-6xl px-2 py-10 sm:px-4 sm:py-16">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Testimonials
        </p>
        <h2 className="mt-2 text-2xl font-medium text-balance sm:text-4xl">
          Don&apos;t take our word for it
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm sm:text-base">
          Marketers, founders, and creators on what Slugy does for them.
        </p>
      </Reveal>

      <Stagger
        className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 md:grid-cols-3 md:gap-6"
        stagger={0.12}
      >
        {TESTIMONIALS.map((t) => (
          <StaggerItem key={t.quote} className="h-full">
            <figure className="flex h-full flex-col rounded-[20px] border border-zinc-200/80 bg-white p-5 sm:p-6 dark:border-zinc-200/20 dark:bg-zinc-900/40">
              <div className="flex gap-0.5" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                {t.image ? (
                  <Image
                    src={t.image}
                    alt={t.name}
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {t.initials}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-muted-foreground text-xs">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
});

Testimonials.displayName = "Testimonials";

export default Testimonials;
