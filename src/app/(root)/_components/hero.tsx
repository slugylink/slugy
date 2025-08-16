"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import AnimatedShinyText from "@/components/web/animated-text";
import HeroLinkForm from "./hero-linkform";

// ---------------------
// Data-Driven Content
// ---------------------
const data = {
  hero: {
    backgroundImage: "https://assets.sandipsarkar.dev/background.jpg",
    backgroundAlt: "Background texture",
    announcement: {
      text: "🚀 Efficient Link Management",
      href: null, // Set if you want the announcement to be a link
    },
    heading1: "Simplify Links Like",
    heading2: "Magic",
    heading2Gradient:
      "mx-auto inline-block w-fit py-1 bg-gradient-to-r from-[#ffaa40] via-[#9c40ff]/90 to-[#ffaa40] bg-clip-text text-center leading-none font-semibold text-transparent [text-fill-color:transparent]",
    fontFamily: "var(--font-bricolage)",
    subheading1: "Slugy is an open-source link management tool.",
    subheading2: "It's fast, secure, and easy to use.",
    badge: {
      imageUrl:
        "https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1001891&theme=dark&t=1754509383464",
      alt: "Slugy - Simplify links like magic | Product Hunt",
      href: "https://www.producthunt.com/products/slugy?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-slugy",
      width: 185,
      height: 54,
    },
  },
};

const Hero = () => {
  const { hero } = data;
  return (
    <section className="container mx-auto px-4">
      {/* Decorative Background */}
      <div className="absolute top-36 right-0 left-1/2 z-0 h-[400px] w-full -translate-x-1/2 overflow-hidden opacity-20 mix-blend-multiply sm:top-48 sm:h-[580px]">
        <Image
          src={hero.backgroundImage}
          alt={hero.backgroundAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover mix-blend-multiply"
          quality={20}
        />
      </div>

      {/* Heading */}
      <div className="relative h-full w-full">
        <div className="mt-8 text-center">
          {/* Banner Button / Announcement */}
          <div className="z-10 mb-6 flex items-center justify-center sm:mb-8 md:mb-12">
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
          </div>

          {/* Large Gradient Heading */}
          <div
            style={{ fontFamily: hero.fontFamily }}
            className="space-y-1 text-3xl font-medium md:space-y-2 md:text-4xl lg:text-[53px]"
          >
            <h2>{hero.heading1}</h2>
            <h2 className={cn(hero.heading2Gradient, "font-medium")}>
              {hero.heading2} <span className="text-[#ffaa40]">✨</span>{" "}
            </h2>
          </div>
          <div className="mx-auto max-w-2xl text-zinc-700">
            <p className="mt-4 text-sm sm:mt-6 sm:text-base md:text-lg">
              {hero.subheading1}
            </p>
            <p className="text-sm sm:text-base md:text-lg">
              {hero.subheading2}
            </p>
          </div>
        </div>

        {/* Product Hunt Badge */}
        <div className="mt-6 flex items-center justify-center gap-5">
          <a href={hero.badge.href} target="_blank" rel="noopener noreferrer">
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
          </a>
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
        </div>

        {/* Form */}
        <HeroLinkForm />
      </div>
    </section>
  );
};

export default Hero;
