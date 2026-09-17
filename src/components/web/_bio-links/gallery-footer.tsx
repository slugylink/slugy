"use client";

import { useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GalleryFooter({
  placement = "fixed",
}: {
  placement?: "fixed" | "absolute";
}) {
  const [visible, setVisible] = useState(true);

  const handleClose = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "z-50 inline-flex items-center gap-0.5 rounded-sm bg-white py-1 pr-1.5 pl-1 text-[11px] font-medium text-zinc-800 shadow-[0_4px_14px_rgba(15,23,42,0.12)] ring-1 ring-black/5",
        placement === "fixed"
          ? "fixed right-4 bottom-4"
          : "absolute right-3 bottom-3",
      )}
    >
      <Link
        href="https://slugy.co?ref=gallery"
        aria-label="Made with Slugy"
        className="inline-flex items-center gap-0.5 transition hover:opacity-80"
      >
        <span className="mr-0.5 font-normal">Made with</span>

        <Image
          src="/logo.svg"
          alt=""
          width={18}
          height={18}
          className="size-[12px] rounded-[4px]"
        />

        <span className="mr-1 font-semibold">Slugy</span>
      </Link>

      <button
        type="button"
        aria-label="Dismiss badge"
        onClick={handleClose}
        className="rounded-sm p-0.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
      >
        <X size={12} />
      </button>
    </div>
  );
}
