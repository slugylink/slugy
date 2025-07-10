"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import AnimatedShinyText from "@/components/web/animated-text";
import HeroLinkForm from "./hero-linkform";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="container mx-auto px-4">
      <div className="absolute top-36 right-0 left-1/2 z-0 h-[400px] w-full -translate-x-1/2 overflow-hidden opacity-50 mix-blend-multiply sm:top-48 sm:h-[580px]">
        <Image
          src="https://assets.sandipsarkar.dev/background.jpg"
          alt="Background texture"
          fill
          priority
          sizes="100vw"
          className="object-cover mix-blend-multiply"
          quality={80}
        />
      </div>

      {/* Heading */}
      <div className="relative h-full w-full">
        <div className="mt-8 text-center sm:mt-12 md:mt-16">
          <div className="z-10 mb-6 flex items-center justify-center sm:mb-8 md:mb-12">
            <div
              className={cn(
                "group rounded-full border border-black/5 bg-neutral-100 text-base text-white transition-all ease-in hover:cursor-pointer hover:bg-neutral-200 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800",
              )}
            >
              <AnimatedShinyText className="inline-flex items-center justify-center px-3 py-1 text-xs transition ease-out hover:text-neutral-600 hover:duration-300 sm:text-sm hover:dark:text-neutral-400">
                <span className="inline">✨</span> Efficient Link Management
                <ArrowRightIcon className="ml-1 h-3 w-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
              </AnimatedShinyText>
            </div>
          </div>
          <div
            style={{ fontFamily: `var(--font-bricolage)` }}
            className="space-y-1 text-3xl font-semibold md:space-y-2 md:text-4xl lg:text-5xl"
          >
            <h2>Simplify Links Like</h2>
            <h2
              className={cn(
                `mx-auto inline-block w-fit bg-gradient-to-r from-[#ffaa40] via-[#9c40ff]/90 to-[#ffaa40] bg-clip-text text-center leading-none font-semibold text-transparent [text-fill-color:transparent]`,
              )}
            >
              Magic!
            </h2>
          </div>
          <div className="text-muted-foreground mx-auto max-w-2xl">
            <p className="mt-4 text-sm sm:mt-6 sm:text-base md:text-lg">
              Slugy is an open-source link management tool.
            </p>
            <p className="text-sm sm:text-base md:text-lg">
              It&apos;s fast, secure, and easy to use.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="animation-delay-300 z-10 mt-6 flex w-full flex-col items-center justify-center gap-2 sm:mt-8">
          <Link
            href={`app.${process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_ROOT_DOMAIN : "localhost:3000"}`}
          >
            <Button variant={"outline"} className="rounded-lg text-sm">
              Get Started
              <ArrowRightIcon className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
        {/* Form */}
        <HeroLinkForm />
      </div>

      {/* Demo Image */}
      {/* <motion.div
        ref={ref}
        className="relative mt-16 sm:mt-20 md:mt-24 lg:mt-28"
        initial={{ opacity: 0, y: 50 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <HeroImage />
      </motion.div> */}
    </section>
  );
};

export default Hero;
