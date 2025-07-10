"use client";
import React, { memo } from "react";
import Actions from "@/components/web/_tags/tag-actions";
import TagCard from "@/components/web/_tags/tag-card";
import useSWR from "swr";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { Tag } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  color: string | null;
  linkCount: number;
}

interface ApiError extends Error {
  info?: {
    error?: string;
  };
}



const EmptyState = memo(() => (
  <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center rounded-xl border">
    <Tag size={60} className="animate-fade-in" strokeWidth={1.1} />
    <h2 className="mt-2 text-lg font-medium">No tags found</h2>
    <p className="mt-2 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
      Create tags to organize your links
    </p>
  </div>
));

EmptyState.displayName = "EmptyState";

const ErrorState = memo(
  ({ error, onRetry }: { error: ApiError; onRetry: () => void }) => (
    <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center rounded border">
      <h2 className="mt-2 text-lg font-medium">Error loading tags</h2>
      <p className="mt-2 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
        {error.info?.error ??
          error.message ??
          "There was an error loading your tags. Please try again later."}
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

export default function TagsClient({
  workspaceslug,
}: {
  workspaceslug: string;
}) {
  const {
    data: tags,
    error,
    isLoading,
    mutate,
  } = useSWR<Tag[], ApiError>(`/api/workspace/${workspaceslug}/tags`);

  return (
    <div>
      <Actions workspaceslug={workspaceslug} />

      {isLoading && (
        <div className="flex h-[50vh] items-center justify-center">
          <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      )}

      {error && <ErrorState error={error} onRetry={() => mutate()} />}

      {!isLoading && !error && (
        <>
          <div className="mt-6">{tags?.length === 0 && <EmptyState />}</div>
          <div className="mt-6 grid grid-cols-1 gap-2.5">
            {tags?.map((tag) => (
              <TagCard key={tag.id} tag={tag} workspaceslug={workspaceslug} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
