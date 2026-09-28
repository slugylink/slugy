"use client";

import type { BioLinksProps, Theme } from "@/types/bio-links";
import { addUTMParams } from "@/utils/bio-links";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format-number";
import Link from "next/link";
import { useEffect, useState } from "react";
import UrlAvatar from "../url-avatar";
import { ArrowUpRight, MousePointerClick } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_LINK_IMAGE_URL =
  "https://res.cloudinary.com/dcsouj6ix/image/upload/v1771263620/default_t5ngb8.webp";

// ─── Types ────────────────────────────────────────────────────────────────────

type LinkStyle = "link" | "feature" | "feature-grid-2";
type LinkItem = BioLinksProps["links"][number];

type RenderBlock =
  | { type: "single"; link: LinkItem }
  | { type: "grid"; links: LinkItem[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Root origin for short links (bio lives on a subdomain, shorts on root). */
function useShortLinkOrigin(enabled: boolean): string | null {
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    try {
      const { protocol, hostname, port } = window.location;
      if (hostname.startsWith("bio.")) {
        const root = hostname.slice("bio.".length);
        setOrigin(`${protocol}//${root}${port ? `:${port}` : ""}`);
      } else {
        setOrigin(`${protocol}//${hostname}${port ? `:${port}` : ""}`);
      }
    } catch {
      setOrigin(null);
    }
  }, [enabled]);
  return origin;
}

function buildShortHref(
  link: LinkItem,
  rootOrigin: string | null,
): string | null {
  const slug = link.shortSlug ?? link.link?.slug ?? null;
  if (!slug) return null;
  const domain = link.shortDomain ?? link.link?.domain ?? "slugy.co";
  const params = new URLSearchParams({ bio: link.id, ref: "slugy.co" });
  // Custom domains live on their own host — link there directly.
  if (domain !== "slugy.co" && domain !== "www.slugy.co") {
    return `https://${domain}/${slug}?${params.toString()}`;
  }
  // Default domain: resolve against the current root (localhost-aware).
  if (rootOrigin) return `${rootOrigin}/${slug}?${params.toString()}`;
  return `https://${domain}/${slug}?${params.toString()}`;
}

function getTrackedHref(link: LinkItem, rootOrigin: string | null): string {
  // Prefer the workspace short link so the hover/status bar shows
  // slugy.co/xxxx (or the custom domain) instead of an internal API URL.
  // The ?bio= param attributes the click back to this bio button in the
  // short-link redirect pipeline. Fall back to the internal click endpoint
  // for legacy rows without a linked short link.
  const shortHref = buildShortHref(link, rootOrigin);
  if (shortHref) return shortHref;
  if (link.id) return `/api/bio/click/${link.id}`;
  return addUTMParams(link.url);
}

function normalizeStyle(style: string | null | undefined): LinkStyle {
  if (style === "feature" || style === "feature-grid-2") return style;
  return "link";
}

/**
 * Border-radius for image feature cards, derived from the theme's button
 * shape. Image cards ignore the theme's colors (they show photos), but the
 * corner radius follows the theme so cards feel native to it.
 * Pill (rounded-full) themes are capped — a full capsule looks broken on
 * wide aspect-video photos, so they get a large soft radius instead.
 */
function themeCardRadius(buttonStyle: string | undefined): string {
  if (!buttonStyle) return "rounded-[24px]";
  if (buttonStyle.includes("rounded-full")) return "rounded-[28px]";
  if (buttonStyle.includes("rounded-xl")) return "rounded-xl";
  if (buttonStyle.includes("rounded-lg")) return "rounded-lg";
  if (buttonStyle.includes("rounded-md")) return "rounded-md";
  if (buttonStyle.includes("rounded-sm")) return "rounded-sm";
  return "rounded-[24px]";
}

function buildRenderBlocks(links: BioLinksProps["links"]): RenderBlock[] {
  const blocks: RenderBlock[] = [];
  let gridBuffer: LinkItem[] = [];

  for (const link of links) {
    const style = normalizeStyle(link.style);

    if (style === "feature-grid-2") {
      gridBuffer.push(link);

      if (gridBuffer.length === 2) {
        blocks.push({ type: "grid", links: [...gridBuffer] });
        gridBuffer = [];
      }

      continue;
    }

    // Flush any pending grid items before adding a non-grid block
    if (gridBuffer.length > 0) {
      blocks.push({ type: "grid", links: [...gridBuffer] });
      gridBuffer = [];
    }

    blocks.push({ type: "single", link });
  }

  // Flush any remaining grid item (orphaned single column)
  if (gridBuffer.length > 0) {
    blocks.push({ type: "grid", links: [...gridBuffer] });
  }

  return blocks;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LinkCard({
  link,
  href,
  theme,
  paletteClass,
  showClicks = false,
}: {
  link: LinkItem;
  href: string;
  theme: Theme;
  paletteClass?: string;
  showClicks?: boolean;
}) {
  const label = link.title || link.url;

  // Palette themes (e.g. Brutalist): chunky centered button, color cycles per link.
  if (paletteClass) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${label}`}
        className={cn(
          "group flex w-full items-center justify-center border-2 border-black px-4 py-3.5 text-center shadow-[4px_4px_0_#000] transition-all duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:outline-none",
          paletteClass,
        )}
      >
        <span className="truncate text-[15px] font-extrabold tracking-wide text-black">
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit ${label}`}
      className={cn(
        // Structure: left-aligned row with avatar + label + arrow.
        // rounded-2xl is the fallback shape — a theme rounded-* wins via merge.
        "group flex w-full items-center gap-3 rounded-2xl border border-black/[0.06] bg-white/90 px-3 py-3 text-left backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white focus-visible:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:outline-none",
        // Skin (bg, text color, shape, border, hover): owned by the theme.
        theme.buttonStyle,
      )}
    >
      <UrlAvatar
        url={link.url}
        className="border-white bg-white ring-1 ring-black/10 transition-transform duration-200 group-hover:scale-105 dark:border-white dark:bg-white dark:from-white dark:to-white"
      />
      <span className="min-w-0 flex-1 truncate text-[15px]">{label}</span>
      {showClicks ? (
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium opacity-70">
          <MousePointerClick className="size-3.5" aria-hidden="true" />
          {formatNumber(link.clicks ?? 0)}
        </span>
      ) : null}
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition-all duration-200 group-hover:bg-black">
        <ArrowUpRight
          className="size-4 transition-transform duration-200 group-hover:translate-x-[1px] group-hover:-translate-y-[1px]"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

function FeatureCard({
  link,
  href,
  theme,
  framed,
  showClicks = false,
}: {
  link: LinkItem;
  href: string;
  theme: Theme;
  framed?: boolean;
  showClicks?: boolean;
}) {
  const label = link.title || link.url;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit: ${label}`}
      className={cn(
        "group relative block aspect-video overflow-hidden bg-zinc-100 transition-all duration-300 hover:-translate-y-0.5",
        framed
          ? "rounded-none border-2 border-black shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000]"
          : themeCardRadius(theme.buttonStyle),
      )}
    >
      <img
        src={link.image || DEFAULT_LINK_IMAGE_URL}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />

      <div
        className="absolute inset-0 z-10 bg-gradient-to-t from-black/65 via-black/10 to-transparent"
        aria-hidden="true"
      />

      <span className="absolute top-3 left-3 z-20 transition-transform duration-300 group-hover:scale-105">
        <UrlAvatar
          className="size-9 border-white bg-white p-1.5 ring-1 ring-black/10 dark:border-white dark:bg-white dark:from-white dark:to-white"
          url={link.url}
        />
      </span>

      {showClicks ? (
        <span className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
          <MousePointerClick className="size-3" aria-hidden="true" />
          {formatNumber(link.clicks ?? 0)}
        </span>
      ) : null}

      <p className="absolute inset-x-0 bottom-3 z-10 line-clamp-1 px-4 text-left text-sm leading-tight font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] sm:text-base">
        {label}
      </p>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BioLinksList({
  links,
  theme,
  showClicks = false,
  shortOrigin,
}: BioLinksProps) {
  // Prefer the server-computed origin (correct href on first paint);
  // only fall back to the client lookup when the server didn't provide one.
  const windowOrigin = useShortLinkOrigin(shortOrigin == null);
  const rootOrigin = shortOrigin ?? windowOrigin;

  if (!links.length) {
    return (
      <p className="min-h-[150px] rounded-[18px] px-4 py-6 text-center text-zinc-400">
        No links available.
      </p>
    );
  }

  const blocks = buildRenderBlocks(links);
  const palette = theme?.buttonPalette;
  const framed = !!palette?.length;
  let paletteCursor = 0;
  const nextPaletteClass = () =>
    palette?.length ? palette[paletteCursor++ % palette.length] : undefined;

  return (
    <div className="w-full space-y-3 text-sm">
      {blocks.map((block, index) => {
        if (block.type === "grid") {
          return (
            <div
              key={`grid-${index}`}
              className="grid grid-cols-2 gap-3 sm:gap-4"
            >
              {block.links.map((link) => (
                <FeatureCard
                  key={link.id}
                  link={link}
                  href={getTrackedHref(link, rootOrigin)}
                  theme={theme}
                  framed={framed}
                  showClicks={showClicks}
                />
              ))}
            </div>
          );
        }

        if (normalizeStyle(block.link.style) === "feature") {
          return (
            <FeatureCard
              key={block.link.id}
              link={block.link}
              href={getTrackedHref(block.link, rootOrigin)}
              theme={theme}
              framed={framed}
              showClicks={showClicks}
            />
          );
        }

        return (
          <LinkCard
            key={block.link.id}
            link={block.link}
            href={getTrackedHref(block.link, rootOrigin)}
            theme={theme}
            paletteClass={nextPaletteClass()}
            showClicks={showClicks}
          />
        );
      })}
    </div>
  );
}
