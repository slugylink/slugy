import { memo } from "react";
import { Link } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import LinkCard from "./link-card";

// Types
export interface Link {
  id: string;
  url: string;
  slug: string;
  clicks: number;
  description?: string | null;
  expiresAt?: Date | null;
  isArchived?: boolean;
  isPublic: boolean;
  creator: { name: string | null; image: string | null } | null;
  qrCode: {
    id: string;
    customization?: string;
  };
}

export interface ApiResponse {
  links: Link[];
  totalLinks: number;
  totalPages: number;
}

// Memoized skeleton component
export const LinkCardSkeleton = memo(() => (
  <>
    {Array.from({ length: 3 }, (_, index) => (
      <div
        key={index}
        className="flex w-full flex-row items-start space-y-0 rounded-xl border p-[21px] sm:items-center sm:space-x-4 mb-4"
      >
        <div className="hidden rounded-full sm:block">
          <Skeleton className="size-9 rounded-full" />
        </div>
        <div className="min-w-0 flex-1 space-y-[6px]">
          <div className="flex items-center gap-2 sm:flex-row">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-4" />
          </div>
          <Skeleton className="h-3 w-[60%]" />
        </div>
        <div className="flex h-full w-auto items-center justify-end">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="ml-2 h-6 w-6" />
        </div>
      </div>
    ))}
  </>
));

LinkCardSkeleton.displayName = "LinkCardSkeleton";

// Memoized empty state
export const EmptyState = memo(({ searchQuery }: { searchQuery: string }) => (
  <div className="flex h-full min-h-[65vh] w-full flex-col items-center justify-center rounded-xl border">
    <Link size={50} className="animate-fade-in" strokeWidth={1.1} />
    <h2 className="mt-2 text-lg font-medium">No links found</h2>
    <p className="mt-2 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
      {searchQuery
        ? "No links match your search criteria."
        : "You haven't created any links yet."}
    </p>
  </div>
));

EmptyState.displayName = "EmptyState";

// Memoized error state
export const ErrorState = memo(
  ({ error, onRetry }: { error: Error; onRetry: () => void }) => (
    <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center rounded border">
      <h2 className="mt-2 text-lg font-medium">Error loading links</h2>
      <p className="mt-2 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
        {error.message ||
          "There was an error loading your links. Please try again later."}
      </p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        Try Again
      </button>
    </div>
  ),
);

ErrorState.displayName = "ErrorState";

// Memoized link list
export const LinkList = memo(
  ({
    links,
    isGridLayout,
    isLoading,
    isSelectModeOn,
    selectedLinks,
    onSelect,
  }: {
    links: Link[];
    isGridLayout: boolean;
    isLoading: boolean;
    isSelectModeOn: boolean;
    selectedLinks: Set<string>;
    onSelect: (id: string) => void;
  }) => (
    <div
      className={`mb-24 grid gap-4 ${isGridLayout ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"} ${isLoading ? "opacity-70" : ""}`}
      aria-label="Link list"
    >
      {links.map((link) => (
        <LinkCard
          key={link.id}
          link={link}
          isPublic={link.isPublic}
          isSelectModeOn={isSelectModeOn}
          isSelected={selectedLinks.has(link.id)}
          onSelect={() => onSelect(link.id)}
        />
      ))}
    </div>
  ),
);

LinkList.displayName = "LinkList";

// Bulk operation confirmation dialog
export const BulkOperationDialog = memo(
  ({
    isOpen,
    onClose,
    operation,
    selectedCount,
    onConfirm,
    isProcessing,
  }: {
    isOpen: boolean;
    onClose: () => void;
    operation: "delete" | "archive" | null;
    selectedCount: number;
    onConfirm: () => void;
    isProcessing: boolean;
  }) => {
    if (!operation) return null;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-white sm:max-w-md dark:bg-black p-4">
          <DialogHeader>
            <DialogTitle>
              {operation === "delete" ? "Delete" : "Archive"} Links
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {operation} {selectedCount} selected{" "}
              {selectedCount === 1 ? "link" : "links"}?
              {operation === "delete" && " This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant={operation === "delete" ? "destructive" : "default"}
              onClick={onConfirm}
              disabled={isProcessing}
            >
              {isProcessing && (
                <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
              )}
              {operation === "delete" ? "Delete" : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);

BulkOperationDialog.displayName = "BulkOperationDialog";
