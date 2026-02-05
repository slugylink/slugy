"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
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
              <div className="mb-12 w-full max-w-lg">
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
            </div>
          </div>
          {/* Main Heading */}
          <h1
            className={cn(
              bricolage.className,
              "mb-6 text-center text-4xl font-medium text-zinc-900 sm:text-2xl md:text-4xl lg:text-5xl",
            )}
          >
            Welcome to Slugy
          </h1>

          {/* Descriptive Paragraph */}
          <p className="mx-auto max-w-2xl text-center text-base text-zinc-600 sm:text-lg md:text-xl">
            This custom domain is powered by Slugy - the link management
            platform designed for modern marketing teams.
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-12 flex items-center justify-center gap-4">
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
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

export default Hero;
