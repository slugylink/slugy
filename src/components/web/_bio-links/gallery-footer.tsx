import Link from "next/link";
import { CornerDownRight } from "lucide-react";
import type { GalleryFooterProps } from "@/types/bio-links";

export default function GalleryFooter({ theme }: GalleryFooterProps) {
  return (
    <footer
      className={`relative bottom-0 z-10 flex items-center justify-center gap-1 py-6 pt-10 ${theme.textColor}`}
    >
      <CornerDownRight size={14} />
      <Link
        href="https://slugy.co"
        className="transition-opacity hover:opacity-80"
        aria-label="Visit Slugy homepage"
      >
        slugy
      </Link>
    </footer>
  );
}
