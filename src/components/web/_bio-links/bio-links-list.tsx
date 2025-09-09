import type { BioLinks } from "@prisma/client";
import type { BioLinksProps } from "@/types/bio-links";
import { addUTMParams } from "@/utils/bio-links";

export default function BioLinksList({ links, theme }: BioLinksProps) {
  if (!links.length) {
    return (
      <p className={`text-center ${theme.textColor}`}>No links available.</p>
    );
  }

  return (
    <div className="mt-3 w-full space-y-3 pt-4 text-sm">
      {links.map((link) => (
        <a
          key={link.id}
          href={addUTMParams(link.url)}
          target="_blank"
          rel="noopener noreferrer"
          className={`block w-full rounded-full px-4 py-[10px] text-center transition ${theme.buttonStyle} hover:opacity-90 focus:opacity-90 focus:outline-none`}
          aria-label={`Visit ${link.title || link.url}`}
        >
          {link.title || link.url}
        </a>
      ))}
    </div>
  );
}
