"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import AnimatedShinyText from "@/components/web/animated-text";
import HeroLinkForm from "./hero-linkform";
import { LazyMotion, domAnimation, m } from "motion/react";
import { memo } from "react";
import { Button } from "@/components/ui/button";

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

const heroData = {
  announcement: {
    text: (
      <>
        Not Backed by{" "}
        <span className="mx-2 aspect-square size-5 bg-orange-500 p-[0px] text-center text-white">
          Y
        </span>{" "}
        Combinator
      </>
    ),
  },
  heading1: "Short Links with Powerful",
  heading2: (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
      Analytics
      <span className="text-[#ffaa40]">
        <Image
          src={"/icons/star.svg"}
          width={50}
          height={50}
          alt="Slugy"
          priority
          sizes="(max-width: 640px) 32px, 50px"
          className="h-8 w-8 sm:h-[50px] sm:w-[50px]"
        />
      </span>
    </div>
  ),
  heading2Gradient:
    "mx-auto inline-block w-fit py-1 bg-gradient-to-r from-[#ffaa40] via-[#ffaa40]/90 to-[#9c40ff] bg-clip-text text-center leading-none font-semibold text-transparent",
  subheading1: (
    <>
      Branded links, analytics, QR codes and link-in-bio
      <br className="hidden sm:block" /> — without the enterprise price tag.
    </>
  ),
} as const;

const Hero = memo(function Hero() {
  const handleViewDemo = () => {
    const demoSection = document.getElementById("demo");
    if (!demoSection) return;
    demoSection.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <LazyMotion features={domAnimation}>
      <section className="mx-auto max-w-6xl px-3 sm:px-4">
        <div className="relative h-full w-full">
          <div className="mt-6 text-center sm:mt-8">
            <m.div
              className="z-10 mb-6 flex items-center justify-center sm:mb-8 md:mb-12"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: easeOutExpo, delay: 0.05 }}
            >
              <div
                className={cn(
                  "group rounded-full border border-black/10 bg-neutral-50/90 text-white transition-colors hover:cursor-pointer hover:bg-neutral-100 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800",
                )}
              >
                <AnimatedShinyText className="inline-flex items-center justify-center px-2.5 py-1 text-[11px] transition ease-out hover:text-neutral-600 hover:duration-300 sm:px-3 sm:text-sm hover:dark:text-neutral-400">
                  <span className="inline pb-1" /> {heroData.announcement.text}
                  <ArrowRightIcon className="ml-1 h-3 w-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
                </AnimatedShinyText>
              </div>
            </m.div>

            <h1 className="space-y-0.5 text-[29px] leading-[0.95] font-medium sm:text-4xl sm:leading-[0.95] md:text-5xl lg:text-[53px]">
              <m.span
                className="block"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: easeOutExpo, delay: 0.12 }}
              >
                <span className="text-balance">{heroData.heading1}</span>
              </m.span>
              <m.span
                className={cn(heroData.heading2Gradient, "block font-medium")}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: easeOutExpo, delay: 0.22 }}
              >
                {heroData.heading2}
              </m.span>
            </h1>

            <div className="mx-auto max-w-2xl text-zinc-700">
              <m.p
                className="mt-4 px-1 text-sm sm:mt-4 sm:text-base md:px-0 md:text-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: easeOutExpo, delay: 0.32 }}
              >
                {heroData.subheading1}
              </m.p>
              <m.div
                className="mt-6 flex flex-row items-center justify-center gap-3 sm:mt-7"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: easeOutExpo, delay: 0.4 }}
              >
                <Button
                  asChild
                  className="w-auto transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Link href="https://app.slugy.co">Get Started</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleViewDemo}
                  className="border-zinc-300 bg-white/70 text-zinc-800 transition-transform duration-200 hover:scale-[1.02] hover:bg-zinc-50 active:scale-[0.98]"
                >
                  View a Demo
                </Button>
              </m.div>
            </div>
          </div>

          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.48 }}
          >
            <HeroLinkForm />
          </m.div>
        </div>
      </section>
    </LazyMotion>
  );
});

Hero.displayName = "Hero";

export default Hero;
