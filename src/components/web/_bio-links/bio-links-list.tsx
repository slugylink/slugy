import type { BioLinksProps } from "@/types/bio-links";
import { addUTMParams } from "@/utils/bio-links";
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

function LinkCard({ link }: { link: LinkItem }) {
  const label = link.title || link.url;

  return (
    <Link
      href={addUTMParams(link.url)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit ${label}`}
      className="group flex w-full items-center gap-3 rounded-2xl border bg-zinc-50 px-3 py-3 text-left hover:opacity-90 focus:opacity-90 focus:outline-none"
    >
      <UrlAvatar
        url={link.url}
        className="border-white bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)] ring-1 ring-black/5 dark:border-white dark:bg-white dark:from-white dark:to-white"
      />
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-zinc-700">
        {label}
      </span>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-white shadow-sm transition duration-200 group-hover:bg-zinc-900">
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </span>
    </Link>
  );
}

function FeatureCard({ link }: { link: LinkItem }) {
  const label = link.title || link.url;

  return (
    <Link
      href={addUTMParams(link.url)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit: ${label}`}
      className="group relative block aspect-video overflow-hidden rounded-[24px] border bg-zinc-100"
    >
      <img
        src={link.image || DEFAULT_LINK_IMAGE_URL}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />

      <div
        className="absolute inset-0 z-10 bg-gradient-to-t from-black/45 via-black/5 to-transparent"
        aria-hidden="true"
      />

      <span className="absolute top-3 left-3 z-20">
        <UrlAvatar
          className="size-9 border-white bg-white p-1.5 shadow-sm dark:border-white dark:bg-white dark:from-white dark:to-white"
          url={link.url}
        />
      </span>

      <p className="absolute inset-x-0 bottom-3 z-10 line-clamp-1 px-4 text-left text-sm leading-tight font-semibold text-white drop-shadow-sm sm:text-base">
        {label}
      </p>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BioLinksList({ links }: BioLinksProps) {
  if (!links.length) {
    return (
      <p className="min-h-[150px] rounded-[18px] px-4 py-6 text-center text-zinc-400">
        No links available.
      </p>
    );
  }

  const blocks = buildRenderBlocks(links);

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
                <FeatureCard key={link.id} link={link} />
              ))}
            </div>
          );
        }

        if (normalizeStyle(block.link.style) === "feature") {
          return <FeatureCard key={block.link.id} link={block.link} />;
        }

        return <LinkCard key={block.link.id} link={block.link} />;
      })}
    </div>
  );
}
