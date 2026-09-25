import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FaGithub } from "react-icons/fa6";

export default function OpenSource() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-[24px] bg-zinc-950 px-6 py-16 text-center sm:py-20 dark:border dark:border-zinc-800">
        <div
          className="landing-dot-grid pointer-events-none absolute inset-0 opacity-20"
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-2xl">
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
            Open Source
          </p>
          <h2 className="mt-2 text-2xl font-medium text-balance text-white sm:text-4xl">
            Give every link a job
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400 sm:text-base">
            Free short links, analytics, QR codes, and bio pages. Open source,
            fast, and easy to use.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-lg bg-white text-zinc-900 hover:bg-zinc-200"
            >
              <Link href="https://app.slugy.co/signup">Start for free</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <Link target="_blank" href="https://github.com/slugylink/slugy">
                <FaGithub className="mr-2 h-5 w-5" />
                GitHub
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
