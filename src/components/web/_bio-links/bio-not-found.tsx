"use client";

import { memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { AtSign, ArrowUpRight, Home, Sparkles } from "lucide-react";
import { Bricolage_Grotesque } from "next/font/google";
import { cn } from "@/lib/utils";
import GalleryFooter from "@/components/web/_bio-links/gallery-footer";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: true,
  display: "swap",
});

function getAttemptedUsername(pathname: string | null): string | null {
  if (!pathname) return null;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  // /b/:username, /bio/:username, or /:username (bio subdomain rewrite)
  const last = segments[segments.length - 1];
  if (last === "b" || last === "bio" || last === "not-found") return null;
  const candidate = decodeURIComponent(last).trim().slice(0, 30);
  if (!candidate || !/^[a-zA-Z0-9_.-]+$/.test(candidate)) return null;
  return candidate;
}

/**
 * Bio 404 — renders like a real bio page (default dotted theme, profile
 * header, full-width link cards) so a missing handle feels native instead
 * of a generic marketing error page.
 */
const BioNotFound = memo(function BioNotFound() {
  const pathname = usePathname();
  const username = getAttemptedUsername(pathname);
  const initial = (username?.charAt(0) ?? "?").toUpperCase();

  return (
    <div className="relative min-h-screen w-full overscroll-x-none bg-[#f6f6f7] bg-[radial-gradient(#e4e3e6_1.15px,transparent_1.15px)] bg-[size:18px_18px] bg-fixed">
      <div className="relative z-10 mx-auto w-full md:max-w-md">
        <div className="relative">
          <div className="px-6 pt-14 pb-2">
            <motion.section
              className="relative z-10 mt-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-center gap-1.5">
                    <h1 className="min-w-0 flex-1 truncate text-xl leading-none font-bold tracking-tight text-zinc-900 sm:text-2xl">
                      {username ? `@${username}` : "This page"}
                    </h1>
                  </div>
                  <p className="mt-2 max-w-[16rem] text-[13px] leading-snug text-zinc-400 sm:max-w-xs sm:text-[14px]">
                    This bio page doesn&apos;t exist yet.
                  </p>
                </div>
                <div className="relative shrink-0">
                  <div
                    aria-hidden
                    className="relative z-[1] flex size-[68px] items-center justify-center rounded-full bg-zinc-200 text-2xl font-bold text-zinc-500 ring-1 ring-black/5 sm:size-[75px]"
                  >
                    {initial}
                  </div>
                </div>
              </div>
            </motion.section>
          </div>

          <div className="relative z-10 space-y-4 px-4 pt-6 pb-16">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
            >
              <h2
                className={cn(
                  bricolage.className,
                  "text-3xl font-bold tracking-tight text-zinc-900",
                )}
              >
                Page not found
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-500">
                The link you followed may be broken, or the page may have been
                removed.
              </p>
            </motion.div>

            <motion.div
              className="w-full space-y-3 text-sm"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.25 }}
            >
              <Link
                href="https://slugy.co/app?ref=bio-404"
                className="group flex w-full items-center gap-3 rounded-2xl border border-transparent bg-gradient-to-r from-[#ffaa40] to-[#9c40ff] px-3 py-3 text-left text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-[#9c40ff]/40 focus-visible:outline-none"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Sparkles className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                  {username ? `Claim @${username}` : "Create your bio page"}
                </span>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-zinc-900 transition-all duration-200">
                  <ArrowUpRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-[1px] group-hover:-translate-y-[1px]"
                    aria-hidden="true"
                  />
                </span>
              </Link>

              <Link
                href="https://slugy.co"
                className="group flex w-full items-center gap-3 rounded-2xl border border-black/[0.06] bg-white/90 px-3 py-3 text-left text-zinc-800 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white focus-visible:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:outline-none"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100">
                  <Home className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  Go to Homepage
                </span>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition-all duration-200 group-hover:bg-black">
                  <ArrowUpRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-[1px] group-hover:-translate-y-[1px]"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </motion.div>

            {username ? (
              <motion.p
                className="flex items-center justify-center gap-1.5 px-4 pt-1 text-center text-xs text-zinc-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.35 }}
              >
                <AtSign className="size-3" aria-hidden="true" />
                bio.slugy.co/{username} is available
              </motion.p>
            ) : null}
          </div>

          <GalleryFooter />
        </div>
      </div>
    </div>
  );
});

BioNotFound.displayName = "BioNotFound";

export default BioNotFound;
