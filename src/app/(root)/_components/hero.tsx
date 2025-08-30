"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import AnimatedShinyText from "@/components/web/animated-text";
import HeroLinkForm from "./hero-linkform";
import { motion } from "motion/react";
import { Bricolage_Grotesque } from "next/font/google";

// ---------------------
// Data-Driven Content
// ---------------------
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const data = {
  hero: {
    backgroundImage: "https://assets.sandipsarkar.dev/background.jpg",
    backgroundAlt: "Background texture",
    announcement: {
      text: <>Not Backed by <span className="bg-orange-500 text-white aspect-square size-5 p-[1px] text-center mx-2">Y</span> Combinator</>,
      href: null,
    },
    heading1: "Simplify Links Like",
    heading2: (
      <>
        <span className="text-[#ffaa40]">✨</span>Magic
      </>
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
  },
};

const Hero = () => {
  const { hero } = data;

  return (
    <section className="container mx-auto px-4">
      {/* Decorative Background */}
      <motion.div
        className="absolute top-36 right-0 left-1/2 z-0 h-[400px] w-full -translate-x-1/2 overflow-hidden opacity-20 mix-blend-multiply sm:top-48 sm:h-[580px]"
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image
          src={hero.backgroundImage}
          alt={hero.backgroundAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-20 mix-blend-multiply"
        />
      </motion.div>

      {/* Heading */}
      <div className="relative h-full w-full">
        <div className="mt-8 text-center">
          {/* Announcement Banner */}
          <motion.div
            className="z-10 mb-6 flex items-center justify-center sm:mb-8 md:mb-12"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.2,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.05,
            }}
          >
            <div
              className={cn(
                "group rounded-full border border-black/10 bg-neutral-50 text-base text-white transition-all hover:cursor-pointer hover:bg-neutral-100 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800",
              )}
            >
              <AnimatedShinyText className="inline-flex items-center justify-center px-3 py-1 text-xs transition ease-out hover:text-neutral-600 hover:duration-300 sm:text-sm hover:dark:text-neutral-400">
                <span className="inline"></span> {hero.announcement.text}
                <ArrowRightIcon className="ml-1 h-3 w-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
              </AnimatedShinyText>
            </div>
          </motion.div>

          {/* Large Gradient Heading */}
          <motion.div
            className="space-y-1 text-3xl font-medium md:space-y-2 md:text-4xl lg:text-[53px]"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          >
            <motion.h2
              className={bricolage.className}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.12,
              }}
            >
              {hero.heading1}
            </motion.h2>
            <motion.h2
              className={cn(
                bricolage.className,
                hero.heading2Gradient,
                "font-medium",
              )}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.18,
              }}
            >
              {hero.heading2}
            </motion.h2>
          </motion.div>
          <div className="mx-auto max-w-2xl text-zinc-700">
            <motion.p
              className="mt-4 text-sm sm:mt-6 sm:text-base md:text-xl"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.24,
              }}
            >
              {hero.subheading1}
            </motion.p>
            {hero.subheading2 && (
              <motion.p
                className="text-sm sm:text-base md:text-lg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.28,
                }}
              >
                {hero.subheading2}
              </motion.p>
            )}
          </div>
        </div>

        {/* Product Hunt / Peerlist Badge */}
        <motion.div
          className="mt-6 flex items-center justify-center gap-2 sm:gap-4"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* <a href={hero.badge.href} target="_blank" rel="noopener noreferrer">
            <Image
              src={hero.badge.imageUrl}
              alt={hero.badge.alt}
              style={{
                width: `${hero.badge.width}px`,
                height: `${hero.badge.height}px`,
              }}
              width={hero.badge.width}
              height={hero.badge.height}
            />
          </a> */}
          <a
            href="https://peerlist.io/sandipsarkar/project/slugy--magic-links"
            target="_blank"
            rel="noreferrer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://peerlist.io/api/v1/projects/embed/PRJHKKD8MG6L9DDBECOARK8G8GEPBR?showUpvote=true"
              alt="Slugy - Magic Links 🔥"
              style={{
                width: `${hero.badge.width}px`,
                height: `${hero.badge.height}px`,
              }}
            />
          </a>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        >
          <HeroLinkForm />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
