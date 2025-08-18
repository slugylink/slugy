"use client";
import { useState, useCallback, useMemo, memo } from "react";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  LinkPreviewComponent,
  CopyButton,
  AnalyticsBadge,
  SHORT_URL_BASE,
} from "@/components/web/_links/link-card-components";
import Image from "next/image";

// Demo link data for feature showcase
const DEMO_LINKS = [
  {
    id: "demo-1",
    url: "https://slugy.co",
    icon: "/icon.svg",
    slug: "app",
    clicks: 1247,
    domain: "slugy.co",
  },
  {
    id: "demo-2",
    url: "https://github.com/slugylink/slugy",
    slug: "git",
    icon: "/icons/github.svg",
    clicks: 876,
    domain: "github.com ",
  },
  {
    id: "demo-3",
    url: "https://sandipsarkar.dev",
    icon: "/icons/github.svg",
    slug: "sandip",
    clicks: 523,
    domain: "sandipsarkar.dev",
  },
];

interface FeatureLinkCardProps {
  link: (typeof DEMO_LINKS)[0];
  isCompact?: boolean;
  className?: string;
}

const COPY_TIMEOUT = 2000;

export default function FeatureLinkCard({
  link,
  isCompact = false,
  className,
}: FeatureLinkCardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const shortUrl = useMemo(
    () => `${SHORT_URL_BASE}${link?.slug}`,
    [link?.slug],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setIsCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setIsCopied(false), COPY_TIMEOUT);
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Failed to copy to clipboard");
    }
  }, [shortUrl]);

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex w-full flex-row items-center space-y-0 space-x-3 rounded-xl border bg-white p-3 px-4 transition-shadow hover:shadow-[0_0_16px_rgba(0,0,0,0.07)] sm:items-center",
          isCompact && "p-3",
          className,
        )}
      >
        {/* Avatar */}
        <LinkAvatar icon={link.icon} />

        {/* Main Content */}
        <div className="min-w-0 flex-1 space-y-[6px]">
          <div className="flex items-center gap-1 sm:flex-row">
            <p
              className={cn(
                "max-w-[calc(100%-3rem)] truncate text-sm",
                isCompact && "text-xs sm:text-sm",
              )}
            >
              {SHORT_URL_BASE.replace("https://", "")}
              {link.slug}
            </p>
            <div className="flex items-center gap-2">
              <CopyButton isCopied={isCopied} onClick={handleCopy} />
            </div>
          </div>
          <LinkPreviewComponent url={link.url} />
        </div>

        {/* Analytics Badge */}
        <div className="flex h-full w-auto items-center justify-end">
          <AnalyticsBadge
            clicks={link.clicks}
            isPublic={false}
            pathname="/"
            slug={""}
            onShareAnalytics={() => {}}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

// Export demo data for use in other components
export { DEMO_LINKS };

// Link Avatar Component
const LinkAvatar = memo(({ icon }: { icon: string }) => {
  return (
    <div className="block rounded-full">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border bg-gradient-to-b from-zinc-50/60 to-zinc-100 dark:bg-gradient-to-b dark:from-zinc-900/60 dark:to-zinc-800",
        )}
      >
        <Image
          alt="Link icon"
          title="Link"
          src={icon}
          width={24}
          height={24}
          className="rounded-full p-[2px]"
        />
      </div>
    </div>
  );
});

LinkAvatar.displayName = "LinkAvatar";
