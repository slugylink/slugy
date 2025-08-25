"use client";
import { Button } from "@/components/ui/button";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import Link from "next/link";
import { FaGithub } from "react-icons/fa6";
import { Heart } from "lucide-react";

const OpenSource = () => {
  return (
    <section className="relative mx-auto mt-20 max-w-6xl px-4 md:mt-36">
      <div className="relative overflow-hidden rounded-xl border bg-zinc-200/50 p-1.5 sm:rounded-2xl">
        <div className="cardboard relative mx-auto overflow-hidden rounded-xl border border-zinc-200/60 bg-black/70 shadow-md backdrop-blur-sm backdrop-brightness-50 sm:rounded-2xl dark:border-zinc-700/70 dark:bg-zinc-900/90">
          <FlickeringGrid
            className="absolute inset-0 opacity-20"
            squareSize={4}
            gridGap={8}
            flickerChance={0.5}
            color="rgb(255, 255, 255)"
            maxOpacity={0.7}
          />
          <div className="relative z-10 flex flex-col items-center justify-center gap-4 px-4 py-10 text-white sm:gap-6 sm:px-6 sm:py-16 md:gap-8 md:py-20">
            <h3 className="text-2xl font-medium tracking-tight sm:text-4xl">
              Get started with Slugy
            </h3>

            <p className="max-w-[90%] text-center text-sm text-zinc-300 sm:max-w-[85%] sm:text-base md:max-w-[75%] lg:max-w-[60%] dark:text-zinc-300">
              Slugy is an open-source link management tool. <br /> It&apos;s
              fast, secure, and easy to use.
            </p>

            <div className="relative z-10 flex flex-wrap items-center justify-center gap-4">
              <Link target="_blank" href="https://github.com/slugylink/slugy">
                <Button
                  variant={"secondary"}
                  className="rounded-md bg-white text-black"
                >
                  Start for free
                </Button>
              </Link>
              <Link target="_blank" href="https://github.com/slugylink/slugy">
                <Button className="rounded-md bg-zinc-600 hover:bg-zinc-500">
                  <FaGithub className="mr-1 h-5 w-5" />
                  Github
                </Button>
              </Link>
              {/* <Link
                target="_blank"
                href="https://github.com/sponsors/slugylink"
              >
                <Button variant="outline" className="rounded-lg text-black">
                  <Heart className="mr-2 h-5 w-5 text-pink-500" />
                  Support
                </Button>
              </Link> */}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OpenSource;
