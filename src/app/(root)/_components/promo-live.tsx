"use client";

import Link from "next/link";
import useSWR from "swr";
import { PRICING_COPY } from "@/constants/data/price";
import { cn } from "@/lib/utils";

export interface PromoStatusClient {
  code: string;
  amount: number;
  promoPrice: number;
  durationLabel: string;
  isRecurring: boolean;
  redeemed: number;
  maxRedemptions: number | null;
  remaining: number | null;
  percentClaimed: number | null;
  isSoldOut: boolean;
  isActive: boolean;
}

const fetcher = async (url: string): Promise<PromoStatusClient> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("promo fetch failed");
  return res.json() as Promise<PromoStatusClient>;
};

export function usePromoStatus() {
  return useSWR<PromoStatusClient>("/api/public/promo", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 30_000,
    dedupingInterval: 30_000,
  });
}

function LiveDot({ soldOut }: { soldOut: boolean }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {!soldOut && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
      )}
      <span
        className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          soldOut ? "bg-zinc-400" : "bg-emerald-500",
        )}
      />
    </span>
  );
}

function formatCount(status?: PromoStatusClient): string | null {
  if (!status || status.maxRedemptions === null) return null;
  return `${status.redeemed}/${status.maxRedemptions}`;
}

/**
 * Hero pill: GETPRO · Pro $5/mo forever · live 3/25 claimed. Links to #pricing.
 */
export function PromoPill({ className }: { className?: string }) {
  const { data } = usePromoStatus();
  const count = formatCount(data);
  const soldOut = data?.isSoldOut ?? false;

  return (
    <Link
      href="#pricing"
      aria-label={
        count
          ? `Promo ${data?.code ?? PRICING_COPY.promoCode}: ${count} claimed`
          : "See promo pricing"
      }
      className={cn(
        "group border-white-500/25 bg-white-500/[0.07] text-white-950 hover:bg-white-500/[0.13] dark:border-white-400/25 dark:bg-white-400/10 dark:text-white-100 dark:hover:bg-white-400/15 inline-flex max-w-full items-center gap-2 rounded-full border py-1 pr-1 pl-2.5 text-[11px] font-medium transition-colors sm:text-[13px]",
        className,
      )}
    >
      <LiveDot soldOut={soldOut} />
      <span className="truncate">
        {/* <span className="rounded bg-white-500/15 px-1.5 py-0.5 font-mono font-bold tracking-wide">
          {data?.code ?? PRICING_COPY.promoCode}
        </span> */}
        <span className="mx-1.5">
          Pro ${data?.promoPrice ?? PRICING_COPY.promoPrice}/mo{" "}
          {data?.durationLabel ?? PRICING_COPY.promoDuration}
        </span>
      </span>
      {!count ? (
        <span className="bg-background/80 inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 font-mono text-[10px] tabular-nums sm:text-[11px]">
          {soldOut ? "sold out" : `${count} claimed`}
        </span>
      ) : (
        <span className="bg-background/80 inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] sm:text-[11px]">
          {`0/${30} claimed`}
        </span>
      )}
    </Link>
  );
}

/**
 * Pricing-section line (static promo copy only).
 * Live 0/25 count lives only in the hero PromoPill.
 */
export function PromoLiveLine() {
  const { data } = usePromoStatus();

  return (
    <div className="mx-auto mt-3 max-w-2xl">
      <p className="text-primary text-sm font-medium">
        {PRICING_COPY.promoPrefix}{" "}
        <span className="bg-white-500/10 rounded px-2 py-1 font-mono font-bold">
          {data?.code ?? PRICING_COPY.promoCode}
        </span>{" "}
        {PRICING_COPY.promoSuffix}
      </p>
    </div>
  );
}
