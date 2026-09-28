import type { BioLinksProps } from "@/types/bio-links";
import { addUTMParams } from "@/utils/bio-links";
import { cn } from "@/lib/utils";
import Link from "next/link";
import UrlAvatar from "../url-avatar";
import { ArrowUpRight } from "lucide-react";

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

function normalizeStyle(style: string | null | undefined): LinkStyle {
  if (style === "feature" || style === "feature-grid-2") return style;
  return "link";
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
  paletteClass,
}: {
  link: LinkItem;
  paletteClass?: string;
}) {
  const label = link.title || link.url;

  // Palette themes (e.g. Brutalist): chunky centered button, color cycles per link.
  if (paletteClass) {
    return (
      <Link
        href={addUTMParams(link.url)}
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
      href={addUTMParams(link.url)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit ${label}`}
      className="group flex w-full items-center gap-3 rounded-2xl border border-black/[0.06] bg-white/90 px-3 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_-16px_rgba(15,23,42,0.35)] backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_2px_4px_rgba(15,23,42,0.08),0_16px_40px_-16px_rgba(15,23,42,0.4)] focus-visible:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:outline-none"
    >
      <UrlAvatar
        url={link.url}
        className="border-white bg-white shadow-[0_1px_4px_rgba(15,23,42,0.12)] ring-1 ring-black/10 transition-transform duration-200 group-hover:scale-105 dark:border-white dark:bg-white dark:from-white dark:to-white"
      />
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-zinc-800">
        {label}
      </span>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm transition-all duration-200 group-hover:bg-black group-hover:shadow-md">
        <ArrowUpRight
          className="size-4 transition-transform duration-200 group-hover:translate-x-[1px] group-hover:-translate-y-[1px]"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

function FeatureCard({ link, framed }: { link: LinkItem; framed?: boolean }) {
  const label = link.title || link.url;

  return (
    <Link
      href={addUTMParams(link.url)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit: ${label}`}
      className={cn(
        "group relative block aspect-video overflow-hidden bg-zinc-100 transition-all duration-300 hover:-translate-y-0.5",
        framed
          ? "rounded-none border-2 border-black shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000]"
          : "rounded-[24px] border border-black/10 shadow-[0_1px_2px_rgba(15,23,42,0.08),0_16px_40px_-20px_rgba(15,23,42,0.5)] ring-1 ring-white/20 hover:shadow-[0_2px_6px_rgba(15,23,42,0.1),0_24px_48px_-20px_rgba(15,23,42,0.55)]",
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
          className="size-9 border-white bg-white p-1.5 shadow-md ring-1 ring-black/10 dark:border-white dark:bg-white dark:from-white dark:to-white"
          url={link.url}
        />
      </span>

      <p className="absolute inset-x-0 bottom-3 z-10 line-clamp-1 px-4 text-left text-sm leading-tight font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] sm:text-base">
        {label}
      </p>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BioLinksList({ links, theme }: BioLinksProps) {
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
                <FeatureCard key={link.id} link={link} framed={framed} />
              ))}
            </div>
          );
        }

        if (normalizeStyle(block.link.style) === "feature") {
          return (
            <FeatureCard
              key={block.link.id}
              link={block.link}
              framed={framed}
            />
          );
        }

        return (
          <LinkCard
            key={block.link.id}
            link={block.link}
            paletteClass={nextPaletteClass()}
          />
        );
      })}
    </div>
  );
}
