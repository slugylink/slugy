"use client";
import { Button } from "@/components/ui/button";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import Link from "next/link";
import { FaGithub } from "react-icons/fa6";
import { Heart } from "lucide-react";

const OpenSource = () => {
  return (
    <section className="relative mx-auto mt-20 max-w-6xl px-4 md:mt-36">
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-b from-zinc-50 to-zinc-50 p-1.5 sm:rounded-2xl">
        <div className="cardboard relative mx-auto overflow-hidden rounded-xl border border-zinc-200/60 bg-zinc-100 shadow-md backdrop-blur-sm backdrop-brightness-50 sm:rounded-2xl dark:border-zinc-700/70 dark:bg-zinc-900/90">
          <FlickeringGrid
            className="absolute inset-0 opacity-20"
            squareSize={4}
            gridGap={8}
            flickerChance={0.3}
            color="rgb(0, 0, 0)"
            maxOpacity={0.4}
          />
          <div className="relative z-10 flex flex-col items-center justify-center gap-4 px-4 py-10 sm:gap-6 sm:px-6 sm:py-16 md:gap-8 md:py-20">
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              Open Source
            </h3>

            <p className="max-w-[90%] text-center text-sm text-zinc-600 sm:max-w-[85%] sm:text-base md:max-w-[75%] lg:max-w-[60%] dark:text-zinc-300">
              Our source code is available on GitHub - feel free to read,
              review, <br className="hidden sm:inline" /> or contribute to it
              however you want!
            </p>

            <div className="relative z-10 flex flex-wrap items-center justify-center gap-4">
              <Link target="_blank" href="https://slugy.co/git">
                <Button className="rounded-lg">
                  <FaGithub className="mr-2 h-5 w-5" />
                  Star on Github
                </Button>
              </Link>
              <Link
                target="_blank"
                href="https://slugy.co/support"
              >
                <Button variant="outline" className="rounded-lg">
                  <Heart className="mr-2 h-5 w-5 text-pink-500" />
                  Support
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OpenSource;
