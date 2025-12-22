"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Bricolage_Grotesque } from "next/font/google";
import { memo } from "react";
import AppLogo from "@/components/web/app-logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
  heading1: "Simplify Links Like",
  heading2: (
    <div className="flex items-center gap-2">
      <span className="text-[#ffaa40]">
        <Image
          src={"/icons/star.svg"}
          width={50}
          height={50}
          alt="Magic"
          priority
          sizes="50px"
        />
      </span>
      Magic
    </div>
  ),
  heading2Gradient:
    "mx-auto inline-block w-fit py-1 bg-gradient-to-r from-[#ffaa40] via-[#ffaa40]/90 to-[#9c40ff] bg-clip-text text-center leading-none font-semibold text-[text-fill-color:transparent]",
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
    href: "https://www.producthunt.com/products/slugy?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-slugy",
    width: 180,
    height: 50,
  },
} as const;

const Hero = memo(function Hero() {
  const domain = typeof window !== "undefined" ? window.location.hostname : "";

  return (
    <section className="mx-auto flex min-h-[50vh] max-w-6xl flex-col items-center justify-center px-4">
      {/* Heading */}
      <div className="relative h-full w-full">
        <div className="mt-8 text-center">
          <div className="relative z-10 mb-16 flex items-center justify-center">
            <div className="flex size-20 items-center justify-center rounded-full border shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
              <AppLogo />
            </div>
          </div>
          <div className="relative z-10 flex flex-col items-center">
            {/* Mock Browser Window */}
            <motion.div
              className="mb-12 w-full max-w-lg"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                ease: [0.25, 0.46, 0.45, 0.94],
                delay: 0.1,
              }}
            >
              <div className="rounded-md border bg-white">
                {/* Browser Header */}
                <div className="flex items-center gap-2 px-4 py-2.5">
                  {/* macOS Traffic Light Buttons */}
                  <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                    <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                    <div className="h-3 w-3 rounded-full bg-[#28ca42]" />
                  </div>

                  {/* Address Bar */}
                  <div className="ml-4 flex-1">
                    <div className="rounded-md bg-gradient-to-b from-zinc-200 to-zinc-100 px-4 py-1.5 text-center">
                      <span className="line-clamp-1 text-sm font-semibold text-zinc-700">
                        {domain || "go.example.com"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          {/* Main Heading */}
          <motion.h1
            className={cn(
              bricolage.className,
              "mb-6 text-center text-4xl font-medium text-zinc-900 sm:text-2xl md:text-4xl lg:text-5xl",
            )}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: 0.15,
            }}
          >
            Welcome to Slugy
          </motion.h1>

          {/* Descriptive Paragraph */}
          <motion.p
            className="mx-auto max-w-2xl text-center text-base text-zinc-600 sm:text-lg md:text-xl"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: 0.2,
            }}
          >
            This custom domain is powered by Slugy - the link management
            platform designed for modern marketing teams.
          </motion.p>
        </div>

        {/* Buttons */}
        <motion.div
          className="mt-12 flex items-center justify-center gap-4"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94],
            delay: 0.25,
          }}
        >
          <Link href="https://slugy.co"><Button rel="noopener noreferrer" size="lg">
            <span>Try Slugy</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6"
            >
              <path
                fillRule="evenodd"
                d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5H13.5v6.75a.75.75 0 01-1.5 0V14.5H6.75a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z"
                clipRule="evenodd"
              />
            </svg>
          </Button></Link>
        </motion.div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

export default Hero;
