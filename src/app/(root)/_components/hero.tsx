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

// Memoized data object for better performance
const heroData = {
  backgroundImage: "https://assets.sandipsarkar.dev/background.jpg",
  backgroundAlt: "Background texture",
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
    href: null,
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
    "mx-auto inline-block w-fit py-1 bg-gradient-to-r from-[#ffaa40] via-[#ffaa40]/90 to-[#9c40ff] bg-clip-text text-center leading-none font-semibold text- [text-fill-color:transparent]",
  // fontFamily: "var(--font-bricolage)",
  subheading1: (
    <>
      Shorten links, track performance, and understand your audience
      <br className="hidden sm:block" /> — all in one place.
    </>
  ),
  subheading2: "",
  badge: {
    imageUrl:
      "https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1001891&theme=dark&t=1754509383464",
    alt: "Slugy - Simplify links like magic | Product Hunt",
    href: "https://www.producthunt.com/products/slugy?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-slugy",
    width: 180,
    height: 50,
  },
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
        {/* Decorative Background */}
        <m.div
          className="absolute top-28 right-0 left-1/2 z-0 h-[320px] w-full -translate-x-1/2 overflow-hidden opacity-20 mix-blend-multiply sm:top-40 sm:h-[460px] md:top-48 md:h-[580px]"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        ></m.div>

        {/* Heading */}
        <div className="relative h-full w-full">
          <div className="mt-6 text-center sm:mt-8">
            {/* Announcement Banner */}
            <m.div
              className="z-10 mb-6 flex items-center justify-center sm:mb-8 md:mb-12"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.25,
                ease: [0.25, 0.46, 0.45, 0.94],
                delay: 0.1,
              }}
            >
              <div
                className={cn(
                  "group rounded-full border border-black/10 bg-neutral-50 text-white transition-all hover:cursor-pointer hover:bg-neutral-100 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800",
                )}
              >
                <AnimatedShinyText className="inline-flex items-center justify-center px-2.5 py-1 text-[11px] transition ease-out hover:text-neutral-600 hover:duration-300 sm:px-3 sm:text-sm hover:dark:text-neutral-400">
                  <span className="inline pb-1"></span>{" "}
                  {heroData.announcement.text}
                  <ArrowRightIcon className="ml-1 h-3 w-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
                </AnimatedShinyText>
              </div>
            </m.div>

            {/* Large Gradient Heading */}
            <m.div
              className="space-y-0.5 text-[29px] leading-[0.95] font-medium sm:text-4xl sm:leading-[0.95] md:text-5xl lg:text-[53px]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                ease: [0.25, 0.46, 0.45, 0.94],
                delay: 0.15,
              }}
            >
              <m.h2
                // className={bricolage.className}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: 0.2,
                }}
              >
                <span className="text-balance">{heroData.heading1}</span>
              </m.h2>
              <m.h2
                className={cn(
                  // bricolage.className,
                  heroData.heading2Gradient,
                  "font-medium",
                )}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: 0.25,
                }}
              >
                {heroData.heading2}
              </m.h2>
            </m.div>
            <div className="mx-auto max-w-2xl text-zinc-700">
              <m.p
                className="mt-4 px-1 text-sm sm:mt-4 sm:text-base md:px-0 md:text-lg"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: 0.3,
                }}
              >
                {heroData.subheading1}
              </m.p>
              <m.div
                className="mt-6 flex flex-row items-center justify-center gap-3 sm:mt-7"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: 0.35,
                }}
              >
                <Button asChild className="w-auto">
                  <Link href="https://app.slugy.co">Get Started</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleViewDemo}
                  className="border-zinc-300 bg-white/60 text-zinc-800 hover:bg-zinc-50"
                >
                  View a Demo
                </Button>
              </m.div>
              {/* {heroData.subheading2 && (
                <m.p
                  className="text-sm sm:text-base md:text-lg"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    delay: 0.35,
                  }}
                >
                  {heroData.subheading2}
                </m.p>
              )} */}
            </div>
          </div>

          {/* Form */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.35,
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: 0.4,
            }}
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
