"use client";
import { useState, useCallback, useMemo, memo } from "react";
import { Badge } from "@/components/ui/badge";
import { CornerDownRight, Copy, Check, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import QRCodeDesign from "@/components/web/qr-code-design";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// import Link from "next/link";
// import useSWR, { mutate } from "swr";
import { formatNumber } from "@/utils/format-number";
import { cn } from "@/lib/utils";
import UrlAvatar from "@/components/web/url-avatar";

// Memoize the link preview component
const LinkPreviewComponent = memo(({ url }: { url: string }) => (
  <div className="flex w-full items-center">
    <div className="text-muted-foreground flex w-full items-start gap-1 text-sm">
      <CornerDownRight
        strokeWidth={1.5}
        className="mt-0.5 size-4 min-h-3.5 min-w-3.5"
      />
      <a
        target="_blank"
        className="line-clamp-1 cursor-pointer truncate hover:underline"
      >
        {url.replace("https://", "").replace("http://", "").replace("www.", "")}
      </a>
    </div>
  </div>
));

LinkPreviewComponent.displayName = "LinkPreviewComponent";

// Memoize the copy button component
const CopyButton = memo(
  ({ isCopied, onClick }: { isCopied: boolean; onClick: () => void }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto rounded-full p-[1px] hover:bg-transparent"
      onClick={onClick}
      aria-label={isCopied ? "Copied" : "Copy to clipboard"}
    >
      {isCopied ? (
        <Check
          className="h-[0.69rem] w-[0.69rem] text-green-500"
          strokeWidth={1.5}
        />
      ) : (
        <Copy className="p-[1.5px]" strokeWidth={1.8} />
      )}
    </Button>
  ),
);

CopyButton.displayName = "CopyButton";

// Memoize the analytics badge component
const AnalyticsBadge = memo(
  ({
    clicks,
    expires,
  }: {
    clicks: number;
    slug: string;
    pathname: string;
    expires: string | null;
  }) => {
    const timeLeft = useMemo(() => {
      if (!expires) return null;
      const now = new Date();
      const expireDate = new Date(expires);
      const diffInMinutes = Math.floor(
        (expireDate.getTime() - now.getTime()) / (1000 * 60),
      );

      if (diffInMinutes <= 0) return "Expired";
      if (diffInMinutes < 60) return `${diffInMinutes}m left`;
      return `${Math.floor(diffInMinutes / 60)}h ${diffInMinutes % 60}m left`;
    }, [expires]);

    return (
      <Badge
        variant="outline"
        className="flex cursor-pointer items-center justify-center overflow-hidden p-0 text-sm font-normal shadow-none"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col">
              <div className="flex items-center justify-center gap-x-1 bg-zinc-50 px-1.5 py-0.5 text-[13px]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={24}
                  height={24}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4 text-blue-600"
                >
                  <path d="M9 9l5 12 1.774-5.226L21 14 9 9z" />
                  <path d="M16.071 16.071l4.243 4.243" />
                  <path d="M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                {formatNumber(clicks)}
                <span className="hidden sm:inline">clicks</span>
              </div>
              {timeLeft && (
                <div className="flex items-center justify-center border-t px-0.5">
                  <Timer className="size-3 text-orange-500" strokeWidth={1.5} />
                  <span className="text-[10px] text-orange-500">
                    {timeLeft}
                  </span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>{clicks} total clicks</TooltipContent>
        </Tooltip>
      </Badge>
    );
  },
);

AnalyticsBadge.displayName = "AnalyticsBadge";

// Memoize the expiration badge component
const ExpirationBadge = memo(({ expires }: { expires: string }) => {
  const timeLeft = useMemo(() => {
    const now = new Date();
    const expireDate = new Date(expires);
    const diffInMinutes = Math.floor(
      (expireDate.getTime() - now.getTime()) / (1000 * 60),
    );

    if (diffInMinutes <= 0) return "Expired";
    if (diffInMinutes < 60) return `${diffInMinutes}m left`;
    return `${Math.floor(diffInMinutes / 60)}h ${diffInMinutes % 60}m left`;
  }, [expires]);

  return (
    <Badge
      variant="outline"
      className="flex cursor-pointer items-center justify-center gap-x-1 bg-zinc-100/70 text-sm font-normal text-zinc-700 shadow-none hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center gap-x-1 text-[13px]">
            <Timer className="size-4 text-orange-500" strokeWidth={1.5} />
            {timeLeft}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-background border font-medium text-black">
          Expires at {new Date(expires).toLocaleString()}
        </TooltipContent>
      </Tooltip>
    </Badge>
  );
});

ExpirationBadge.displayName = "ExpirationBadge";

interface LinkCardProps {
  link: {
    short?: string;
    original?: string;
    clicks?: number;
    expires?: string | null;
  };
  isSelectModeOn?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export default function LinkCard({ link }: LinkCardProps) {
  // Group related state together
  const [dialogs, setDialogs] = useState({
    qrCode: false,
  });

  const [isCopied, setIsCopied] = useState(false);
  const pathname = usePathname();

  // Memoize the short URL with fallback
  const shortUrl = useMemo(() => link.short || "", [link.short]);

  // Create helper functions to update dialog states
  const updateDialog = useCallback(
    (dialog: keyof typeof dialogs, value: boolean) => {
      setDialogs((prev) => ({ ...prev, [dialog]: value }));
    },
    [],
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(shortUrl)
      .then(() => {
        setIsCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(() => {
        toast.error("Failed to copy to clipboard");
      });
  }, [shortUrl]);

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "bg-background flex w-full cursor-pointer flex-row items-center space-x-3 rounded-xl border p-4 py-3 transition-all hover:shadow-[0_0_16px_rgba(0,0,0,0.08)]",
        )}
      >
        <div className="rounded-full">
          <UrlAvatar url={link.original || ""} />
        </div>
        <div className="min-w-0 flex-1 space-y-[6px]">
          <div className="flex items-center gap-2 sm:flex-row">
            <p className="max-w-[calc(100%-3rem)] truncate text-sm font-medium">
              {link.short || "N/A"}
            </p>
            <div className="flex items-center gap-2">
              <CopyButton isCopied={isCopied} onClick={handleCopy} />
            </div>
          </div>
          <LinkPreviewComponent url={link.original || ""} />
        </div>
        <div className="flex h-full w-auto items-center justify-end">
          <AnalyticsBadge
            clicks={link.clicks ?? 0}
            pathname={pathname}
            slug={link.short?.split("/").pop()?.replace("&c", "") ?? ""}
            expires={link.expires ?? null}
          />
        </div>
      </div>

      {dialogs.qrCode && (
        <Dialog
          open={dialogs.qrCode}
          onOpenChange={(open) => updateDialog("qrCode", open)}
        >
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>QR Code Design</DialogTitle>
            </DialogHeader>
            <QRCodeDesign
              domain="slugy.co"
              linkId={link.short || ""}
              code={link.short?.split("/").pop()?.replace("&c", "") ?? ""}
              onOpenChange={(open) => updateDialog("qrCode", open)}
            />
          </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  );
}
