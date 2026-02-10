import Link from "next/link";
import {
  Check,
  Copy,
  Archive,
  BookText,
  ForwardIcon,
  CornerDownRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import UrlAvatar from "@/components/web/url-avatar";

// Constants
export const SHORT_URL_BASE = "https://slugy.co/";

// Utility functions
export const cleanUrl = (url: string): string =>
  url.replace(/^https?:\/\//, "").replace(/^www\./, "");

// Component interfaces
interface CopyButtonProps {
  isCopied: boolean;
  onClick: () => void;
}

interface DescriptionTooltipProps {
  description: string;
}

interface AnalyticsBadgeProps {
  clicks: number;
  isPublic: boolean;
  pathname: string;
  slug: string;
  onShareAnalytics: () => void;
}

interface SelectionCheckboxProps {
  isSelected: boolean;
}

interface LinkAvatarProps {
  isArchived?: boolean;
  url: string;
}

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

interface AnalyticsIconProps {
  className?: string;
}

interface LinkPreviewComponentProps {
  url: string;
}

// Analytics Icon Component
export const AnalyticsIcon = ({ className }: AnalyticsIconProps) => (
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
    className={cn("size-4", className)}
  >
    <path d="M9 9l5 12 1.774-5.226L21 14 9 9z" />
    <path d="M16.071 16.071l4.243 4.243" />
    <path d="M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
  </svg>
);

// Link Preview Component
export const LinkPreviewComponent = ({ url }: LinkPreviewComponentProps) => (
  <div className="flex w-full items-center">
    <div className="text-muted-foreground flex w-full items-start gap-1 text-sm">
      <CornerDownRight strokeWidth={1.5} size={15} className="mt-0.5" />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground max-w-[calc(100%-3rem)] cursor-pointer truncate hover:underline dark:text-white"
      >
        {cleanUrl(url)}
      </a>
    </div>
  </div>
);

// Copy Button Component
export const CopyButton = ({ isCopied, onClick }: CopyButtonProps) => (
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
);

// Description Tooltip Component
export const DescriptionTooltip = ({
  description,
}: DescriptionTooltipProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <BookText
        className="hidden h-[0.89rem] w-[0.89rem] sm:inline"
        strokeWidth={1.5}
      />
    </TooltipTrigger>
    <TooltipContent>
      <p>{description}</p>
    </TooltipContent>
  </Tooltip>
);

// Analytics Badge Component
export const AnalyticsBadge = ({
  clicks,
  isPublic,
  pathname,
  slug,
  onShareAnalytics,
}: AnalyticsBadgeProps) => (
  <Badge
    variant="outline"
    className="flex cursor-pointer items-center justify-center gap-x-1 rounded-sm bg-zinc-100/50 text-sm font-normal text-zinc-700 shadow-none hover:bg-zinc-200/50 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
  >
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={`${pathname}/analytics?slug_key=${slug}`}>
          <div className="flex items-center justify-center gap-x-1 text-[13px]">
            <AnalyticsIcon className={clicks > 0 ? "text-blue-500" : ""} />
            {formatNumber(clicks)}
            <span className="hidden sm:inline">clicks</span>
          </div>
        </Link>
      </TooltipTrigger>
      <TooltipContent>Click to see analytics</TooltipContent>
    </Tooltip>
    {isPublic && (
      <>
        <Separator
          orientation="vertical"
          className="h-4 bg-zinc-500 dark:bg-zinc-400"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <div onClick={onShareAnalytics} className="cursor-pointer">
              <ForwardIcon size={16} strokeWidth={1.5} />
            </div>
          </TooltipTrigger>
          <TooltipContent>Share analytics</TooltipContent>
        </Tooltip>
      </>
    )}
  </Badge>
);

// Selection Checkbox Component
export const SelectionCheckbox = ({ isSelected }: SelectionCheckboxProps) => (
  <div className="mt-1 mr-2 flex h-9 w-9 items-center justify-center rounded-full border bg-gradient-to-b from-zinc-50/60 to-zinc-100 sm:mt-0 sm:mr-3 dark:bg-gradient-to-b dark:from-zinc-900/60 dark:to-zinc-800">
    <div
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-full transition-colors",
        isSelected
          ? "border-black bg-black dark:border-white dark:bg-white"
          : "border-zinc-300 dark:border-zinc-700",
      )}
    >
      {isSelected && (
        <Check
          strokeWidth={2.7}
          className="h-4 w-4 p-[2px] text-white dark:text-black"
        />
      )}
    </div>
  </div>
);

// Link Avatar Component
export const LinkAvatar = ({ isArchived, url }: LinkAvatarProps) => {
  if (isArchived) {
    return (
      <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full border bg-gradient-to-b from-zinc-50/60 to-zinc-100 sm:mt-0 sm:mr-3 dark:bg-gradient-to-b dark:from-zinc-900/60 dark:to-zinc-800">
        <Archive size={15} className="block text-zinc-500 dark:text-zinc-300" />
      </div>
    );
  }

  return (
    <div className="hidden rounded-full sm:block">
      <UrlAvatar url={url} />
    </div>
  );
};

// Delete Confirmation Dialog Component
export const DeleteConfirmationDialog = ({
  isOpen,
  onOpenChange,
  onConfirm,
  isDeleting,
}: DeleteConfirmationDialogProps) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent className="bg-white sm:max-w-[425px] dark:bg-black">
      <DialogHeader>
        <DialogTitle>Delete Link</DialogTitle>
      </DialogHeader>
      <div>
        <p className="text-muted-foreground text-sm">
          Are you sure you want to delete this link? This action cannot be
          undone.
        </p>
      </div>
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting && <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />}
          Delete
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
