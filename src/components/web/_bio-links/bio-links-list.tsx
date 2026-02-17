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

function LinkCard({
  link,
  theme,
}: {
  link: LinkItem;
  theme: BioLinksProps["theme"];
}) {
  const label = link.title || link.url;

  return (
    <Link
      href={addUTMParams(link.url)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit ${label}`}
      className={`group flex w-full items-center gap-2.5 rounded-xl border border-white/15 px-5 py-4 text-left text-base font-medium backdrop-blur transition hover:opacity-90 focus:opacity-90 focus:outline-none ${theme.buttonStyle}`}
    >
      <UrlAvatar url={link.url} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900 text-zinc-300 transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white">
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
      className="group bg-background relative block aspect-video overflow-hidden rounded-xl"
    >
      {/* Cover image */}
      <img
        src={link.image || DEFAULT_LINK_IMAGE_URL}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
        aria-hidden="true"
      />

      {/* Site favicon */}
      <span className="absolute top-3 left-3 rounded-full shadow-sm">
        <UrlAvatar className="size-8 p-1.5 shadow" url={link.url} />
      </span>

      {/* Title */}
      <p className="md:text-md absolute inset-x-0 bottom-2.5 z-10 line-clamp-1 px-4 text-center text-base leading-tight font-semibold text-white drop-shadow-sm">
        {label}
      </p>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BioLinksList({ links, theme }: BioLinksProps) {
  if (!links.length) {
    return (
      <p
        className={`min-h-[150px] rounded-2xl px-4 py-6 text-center backdrop-blur ${theme.textColor}`}
      >
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

        return <LinkCard key={block.link.id} link={block.link} theme={theme} />;
      })}
    </div>
  );
}
