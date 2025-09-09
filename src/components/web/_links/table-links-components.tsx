import { memo, useMemo } from "react";
import { Link as LinkIcon } from "lucide-react";
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
import { Link } from "../../../types/link-types";

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

// Optimized empty state with better accessibility
export const EmptyState = memo(({ searchQuery }: { searchQuery: string }) => {
  const message = useMemo(() =>
    searchQuery
      ? "No links match your search criteria."
      : "You haven't created any links yet.",
    [searchQuery]
  );

  return (
    <div
      className="flex h-full min-h-[65vh] w-full flex-col items-center justify-center rounded-xl border"
      role="status"
      aria-live="polite"
    >
      <LinkIcon
        size={50}
        className="animate-fade-in"
        strokeWidth={1.1}
        aria-hidden="true"
      />
      <h2 className="mt-2 text-lg font-medium">No links found</h2>
      <p className="mt-2 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
        {message}
      </p>
    </div>
  );
});

EmptyState.displayName = "EmptyState";

// Optimized error state with better UX
export const ErrorState = memo(
  ({ error, onRetry }: { error: Error; onRetry: () => void }) => {
    const errorMessage = useMemo(() =>
      error.message || "There was an error loading your links. Please try again later.",
      [error.message]
    );

    return (
      <div
        className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center rounded border"
        role="alert"
        aria-live="assertive"
      >
        <h2 className="mt-2 text-lg font-medium">Error loading links</h2>
        <p className="mt-2 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
          {errorMessage}
        </p>
        <Button
          onClick={onRetry}
          className="mt-4"
          variant="outline"
          size="sm"
        >
          Try Again
        </Button>
      </div>
    );
  },
);

ErrorState.displayName = "ErrorState";

// Optimized link item component
const LinkItem = memo(({
  link,
  index,
  isSelectModeOn,
  isSelected,
  onSelect,
  isTransitioning
}: {
  link: Link;
  index: number;
  isSelectModeOn: boolean;
  isSelected: boolean;
  onSelect: () => void;
  isTransitioning?: boolean;
}) => (
  <div
    className={`animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out transform transition-all ${
      isTransitioning ? "scale-[0.98] opacity-95" : ""
    }`}
    style={{
      animationDelay: `${Math.min(index * 30, 500)}ms`,
      animationFillMode: 'both'
    }}
  >
    <LinkCard
      link={link}
      isPublic={link.isPublic}
      isSelectModeOn={isSelectModeOn}
      isSelected={isSelected}
      onSelect={onSelect}
    />
  </div>
));

LinkItem.displayName = "LinkItem";

// Optimized link list with better memoization
export const LinkList = memo(({
  links,
  isGridLayout,
  isLoading,
  isSelectModeOn,
  selectedLinks,
  onSelect,
  isTransitioning,
}: {
  links: Link[];
  isGridLayout: boolean;
  isLoading: boolean;
  isSelectModeOn: boolean;
  selectedLinks: Set<string>;
  onSelect: (id: string) => void;
  isTransitioning?: boolean;
}) => {
  // Memoize the grid classes to prevent unnecessary recalculations
  const gridClasses = useMemo(() =>
    `mb-24 grid gap-4 transition-all duration-300 ease-in-out ${
      isGridLayout ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
    } ${isLoading ? "opacity-70" : ""} ${
      isTransitioning ? "scale-[0.99] opacity-90" : ""
    }`,
    [isGridLayout, isLoading, isTransitioning]
  );

  return (
    <div
      className={gridClasses}
      aria-label="Link list"
      role="grid"
      aria-rowcount={links.length}
    >
      {links.map((link, index) => (
        <LinkItem
          key={link.id}
          link={link}
          index={index}
          isSelectModeOn={isSelectModeOn}
          isSelected={selectedLinks.has(link.id)}
          onSelect={() => onSelect(link.id)}
          isTransitioning={isTransitioning}
        />
      ))}
    </div>
  );
});

LinkList.displayName = "LinkList";

// Optimized bulk operation confirmation dialog
export const BulkOperationDialog = memo(({
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
  // Use useMemo hooks before any conditional returns
  const title = useMemo(() =>
    operation ? `${operation === "delete" ? "Delete" : "Archive"} Links` : "",
    [operation]
  );

  const description = useMemo(() =>
    operation ? `Are you sure you want to ${operation} ${selectedCount} selected ${selectedCount === 1 ? "link" : "links"}?${operation === "delete" ? " This action cannot be undone." : ""}` : "",
    [operation, selectedCount]
  );

  const actionText = useMemo(() =>
    operation === "delete" ? "Delete" : "Archive",
    [operation]
  );

  // Early return for better performance
  if (!operation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant={operation === "delete" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing && (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            )}
            {actionText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

BulkOperationDialog.displayName = "BulkOperationDialog";
