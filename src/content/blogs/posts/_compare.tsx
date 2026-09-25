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
