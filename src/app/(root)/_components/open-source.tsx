"use client";
import { Button } from "@/components/ui/button";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import Link from "next/link";
import { FaGithub } from "react-icons/fa6";
import { memo } from "react";

const OpenSource = memo(function OpenSource() {
  return (
    <section className="relative mx-auto my-4 max-w-full">
      <div className="">
        <div className="cardboard relative mx-auto overflow-hidden bg-black/90">
          <svg
            className="curve-svg mx-auto block h-auto w-[92%] sm:w-[72%] lg:w-[50%]"
            viewBox="0 26 1440 90"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="white"
              d="
      M0,25
      L1440,25
      L1440,25
      C1400,25 1352,25 1316,50
      C1290,68 1265,88 1224,88
      L216,88
      C175,88 150,68 124,50
      C88,25 40,25 0,25
    "
            />
          </svg>
          <FlickeringGrid
            className="absolute inset-0 opacity-20"
            squareSize={4}
            gridGap={8}
            flickerChance={0.5}
            color="rgb(255, 255, 255)"
            maxOpacity={0.7}
          />
          <div className="relative z-10 flex flex-col items-center justify-center py-20 pb-24">
            <div className="mx-auto w-full space-y-2 text-center">
              <div className="text-2xl font-medium sm:text-[38px]">
                <h2 className="text-background text-balance">
                  Get started with Slugy
                </h2>
              </div>

              <p className="text-center text-sm text-zinc-300 sm:text-base dark:text-zinc-300">
                Slugy is an open-source link management tool. <br /> It&apos;s
                fast, secure, and easy to use.
              </p>
            </div>
            <div className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link target="_blank" href="https://app.slugy.co/signup">
                <Button
                  variant={"secondary"}
                  className="rounded-md bg-white text-black"
                >
                  Start for free
                </Button>
              </Link>
              <Link target="_blank" href="https://github.com/slugylink/slugy">
                <Button className="rounded-md bg-zinc-700 hover:bg-zinc-700">
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
});

OpenSource.displayName = "OpenSource";

export default OpenSource;
