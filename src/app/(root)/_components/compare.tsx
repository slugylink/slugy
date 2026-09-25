import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CompareTable from "./compare-table";
import { Reveal } from "./reveal";

export default function Compare() {
  return (
    <section className="mx-auto max-w-6xl px-2 py-10 sm:px-4 sm:py-16">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Compare
        </p>
        <h2 className="mt-2 text-2xl font-medium text-balance sm:text-4xl">
          How Slugy stacks up
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm sm:text-base">
          Links, QR, bio, and conversions — against the tools you are already
          comparing us to.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mx-auto mt-8 max-w-4xl sm:mt-10">
        <div className="rounded-[20px] border bg-white p-4 sm:p-6 dark:bg-zinc-950">
          <CompareTable />
          <div className="mt-4 text-center">
            <Link
              href="/alternative/bitly"
              className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4 hover:opacity-80"
            >
              Read the full Bitly comparison <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
