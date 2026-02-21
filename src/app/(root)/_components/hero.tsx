"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import AnimatedShinyText from "@/components/web/animated-text";
import HeroLinkForm from "./hero-linkform";
import { LazyMotion, domAnimation, m } from "motion/react";
import { Bricolage_Grotesque } from "next/font/google";
import { memo } from "react";

// ---------------------
// Optimized Data-Driven Content
// ---------------------
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: true,
  display: "swap",
});

// Memoized data object for better performance
const heroData = {
  backgroundImage: "https://assets.sandipsarkar.dev/background.jpg",
  backgroundAlt: "Background texture",
  announcement: {
    text: (
      <>
        Not Backed by{" "}
        <span className="mx-2 aspect-square size-5 bg-orange-500 p-[1px] text-center text-white">
          Y
        </span>{" "}
        Combinator
      </>
    ),
    href: null,
  },
  heading1: "Turn Every Clicks Into Insightful",
  heading2: (
    <div className="flex items-center gap-2">
      <span className="text-[#ffaa40]">
        <Image
          src={"/icons/star.svg"}
          width={50}
          height={50}
          alt="Slugy"
          priority
          sizes="50px"
        />
      </span>
      Analytics
    </div>
  ),
  heading2Gradient:
    "mx-auto inline-block w-fit py-1 bg-gradient-to-r from-[#ffaa40] via-[#ffaa40]/90 to-[#9c40ff] bg-clip-text text-center leading-none font-semibold text- [text-fill-color:transparent]",
  fontFamily: "var(--font-bricolage)",
  subheading1: (
    <>
      A modern link platform where creators, entrepreneurs{" "}
      <br className="hidden sm:block" /> and teams turn clicks into growth.
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
  return (
    <LazyMotion features={domAnimation}>
      <section className="mx-auto max-w-6xl px-4">
        {/* Decorative Background */}
        <m.div
          className="absolute top-36 right-0 left-1/2 z-0 h-[400px] w-full -translate-x-1/2 overflow-hidden opacity-20 mix-blend-multiply sm:top-48 sm:h-[580px]"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Image
            src={heroData.backgroundImage}
            alt={heroData.backgroundAlt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
            quality={75}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+IRjWjBqO6O2mhP//Z"
            className="object-cover opacity-20 mix-blend-multiply"
          />
        </m.div>

        {/* Heading */}
        <div className="relative h-full w-full">
          <div className="mt-8 text-center">
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
                  "group rounded-full border border-black/10 bg-neutral-50 text-base text-white transition-all hover:cursor-pointer hover:bg-neutral-100 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800",
                )}
              >
                <AnimatedShinyText className="inline-flex items-center justify-center px-3 py-1 text-xs transition ease-out hover:text-neutral-600 hover:duration-300 sm:text-sm hover:dark:text-neutral-400">
                  <span className="inline"></span> {heroData.announcement.text}
                  <ArrowRightIcon className="ml-1 h-3 w-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
                </AnimatedShinyText>
              </div>
            </m.div>

            {/* Large Gradient Heading */}
            <m.div
              className="space-y-1 text-3xl font-medium md:space-y-2 md:text-4xl lg:text-[53px]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                ease: [0.25, 0.46, 0.45, 0.94],
                delay: 0.15,
              }}
            >
              <m.h2
                className={bricolage.className}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: 0.2,
                }}
              >
                {heroData.heading1}
              </m.h2>
              <m.h2
                className={cn(
                  bricolage.className,
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
                className="mt-4 text-sm sm:mt-6 sm:text-base md:text-xl"
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
              {heroData.subheading2 && (
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
              )}
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
