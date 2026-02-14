import Link from "next/link";
import { CornerDownRight } from "lucide-react";
import type { GalleryFooterProps } from "@/types/bio-links";

export default function GalleryFooter() {
  return (
    <footer
      className={`relative bottom-0 z-10 flex items-center justify-center gap-1 py-1`}
    >
      <CornerDownRight size={14} className="mt-2" />
      <Link
        href="https://slugy.co"
        className="mt-2 text-sm transition-opacity hover:opacity-80"
        aria-label="Visit Slugy homepage"
      >
        Create Your Profile On Slugy
      </Link>
    </footer>
  );
}
