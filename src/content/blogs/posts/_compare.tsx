import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="text-foreground mt-12 scroll-mt-24 text-xl font-semibold tracking-tight sm:text-2xl"
    >
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground mt-4 text-[15px] leading-7 sm:text-base">
      {children}
    </p>
  );
}

export function Ul({ children }: { children: ReactNode }) {
  return (
    <ul className="text-muted-foreground mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 sm:text-base">
      {children}
    </ul>
  );
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <aside className="border-border bg-muted/40 text-foreground mt-6 rounded-lg border px-4 py-3 text-sm leading-6">
      {children}
    </aside>
  );
}

export function Facts({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="border-border mt-6 overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[520px] text-left text-sm">
        <tbody className="text-muted-foreground">
          {rows.map(([k, v], i) => (
            <tr
              key={k}
              className={i > 0 ? "border-border border-t" : undefined}
            >
              <td className="text-foreground w-40 px-3 py-2 font-medium">
                {k}
              </td>
              <td className="px-3 py-2">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PricingTable({
  competitor,
  rows,
  note,
}: {
  competitor: string;
  rows: Array<[plan: string, slugy: string, other: string]>;
  note?: string;
}) {
  return (
    <div className="mt-6">
      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[560px] table-fixed text-left text-sm">
          <thead>
            <tr className="bg-muted/40 text-foreground">
              <th className="w-24 px-3 py-2.5 font-medium">Plan</th>
              <th className="bg-orange-50/70 px-3 py-2.5 font-semibold dark:bg-orange-950/20">
                Slugy
              </th>
              <th className="px-3 py-2.5 font-medium">{competitor}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([plan, slugy, other], i) => (
              <tr
                key={plan}
                className={i > 0 ? "border-border border-t" : undefined}
              >
                <td className="text-foreground w-24 px-3 py-3 align-top font-medium whitespace-nowrap">
                  {plan}
                </td>
                <td className="bg-orange-50/70 px-3 py-3 align-top leading-6 text-zinc-700 dark:bg-orange-950/20 dark:text-zinc-300">
                  {slugy}
                </td>
                <td className="text-muted-foreground px-3 py-3 align-top leading-6">
                  {other}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && (
        <p className="text-muted-foreground mt-2 text-xs leading-5">{note}</p>
      )}
    </div>
  );
}

export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="mt-4 space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="bg-foreground text-background mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums">
            {i + 1}
          </span>
          <span className="text-muted-foreground text-[15px] leading-7 sm:text-base">
            {item}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Shot({
  src,
  alt,
  caption,
  width,
  height,
}: {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}) {
  return (
    <figure className="mt-6">
      <div className="border-border overflow-hidden rounded-lg border shadow-sm">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 768px"
          className="h-auto w-full"
        />
      </div>
      <figcaption className="text-muted-foreground mt-2 text-center text-xs leading-5">
        {caption}
      </figcaption>
    </figure>
  );
}

export function Cta() {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link
        href="https://app.slugy.co/signup"
        className="bg-foreground text-background inline-flex h-10 items-center rounded-md px-4 text-sm font-medium"
      >
        Try Slugy free
      </Link>
      <Link
        href="/blogs"
        className="border-border text-foreground inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
      >
        All posts
      </Link>
    </div>
  );
}
