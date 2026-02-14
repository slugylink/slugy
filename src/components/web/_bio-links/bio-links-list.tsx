import type { BioLinksProps } from "@/types/bio-links";
import { addUTMParams } from "@/utils/bio-links";
import Link from "next/link";
import UrlAvatar from "../url-avatar";
import { ArrowUpRight } from "lucide-react";

type LinkStyle = "link" | "feature" | "feature-grid-2";

type LinkItem = BioLinksProps["links"][number];

type RenderBlock =
  | { type: "single"; link: LinkItem }
  | { type: "grid"; links: LinkItem[] };

function normalizeStyle(style: string | null | undefined): LinkStyle {
  if (style === "feature" || style === "feature-grid-2") {
    return style;
  }
  return "link";
}

function buildRenderBlocks(links: BioLinksProps["links"]): RenderBlock[] {
  const blocks: RenderBlock[] = [];
  let gridBuffer: LinkItem[] = [];

  links.forEach((link) => {
    const style = normalizeStyle(link.style);

    if (style === "feature-grid-2") {
      gridBuffer.push(link);
      if (gridBuffer.length === 2) {
        blocks.push({ type: "grid", links: [...gridBuffer] });
        gridBuffer = [];
      }
      return;
    }

    if (gridBuffer.length > 0) {
      blocks.push({ type: "grid", links: [...gridBuffer] });
      gridBuffer = [];
    }

    blocks.push({ type: "single", link });
  });

  if (gridBuffer.length > 0) {
    blocks.push({ type: "grid", links: [...gridBuffer] });
  }

  return blocks;
}

function LinkCard({
  link,
  theme,
}: {
  link: LinkItem;
  theme: BioLinksProps["theme"];
}) {
  return (
    <Link
      key={link.id}
      href={addUTMParams(link.url)}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex w-full items-center gap-2.5 rounded-xl border border-white/15 px-5 py-4 text-left text-base font-medium backdrop-blur transition hover:opacity-90 focus:opacity-90 focus:outline-none ${theme.buttonStyle}`}
      aria-label={`Visit ${link.title || link.url}`}
    >
      <UrlAvatar url={link.url} />
      <span className="min-w-0 flex-1 truncate">{link.title || link.url}</span>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900 text-zinc-300 transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white">
        <ArrowUpRight className="size-4" />
      </span>
    </Link>
  );
}

function FeatureCard({ link }: { link: LinkItem }) {
  return (
    <Link
      key={link.id}
      href={addUTMParams(link.url)}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block aspect-video overflow-hidden rounded-xl bg-zinc-900"
      aria-label={`Visit ${link.title || link.url}`}
    >
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-700 via-zinc-800 to-black" />
      <div className="absolute inset-0 z-10 bg-linear-to-t from-black/80 via-black/25 to-transparent" />
      <span className="absolute top-3 left-3 z-20 rounded-full shadow-sm">
        <UrlAvatar className="size-8 p-1.5" url={link.url} />
      </span>
      <p className="text-md absolute inset-x-0 bottom-3 z-20 line-clamp-2 px-4 text-center leading-tight font-semibold text-white drop-shadow-sm md:text-lg">
        {link.title || link.url}
      </p>
    </Link>
  );
}

export default function BioLinksList({ links, theme }: BioLinksProps) {
  if (!links.length) {
    return (
      <p
        className={`rounded-2xl border border-white/15 bg-white/10 px-4 py-6 text-center backdrop-blur ${theme.textColor}`}
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
              key={`grid-block-${index}`}
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
