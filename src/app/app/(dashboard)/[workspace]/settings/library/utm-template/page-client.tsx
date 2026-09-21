"use client";

import React, { memo, useCallback } from "react";
import Actions from "@/components/web/_utm-templates/utm-template-actions";
import UtmTemplateCard from "@/components/web/_utm-templates/utm-template-card";
import useSWR from "swr";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { DiamondPlus, CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UtmTemplate } from "@/constants/utm-fields";

interface ApiError extends Error {
  info?: {
    error?: string;
  };
}

const EmptyState = memo(() => (
  <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center rounded-xl border">
    <DiamondPlus size={60} className="animate-fade-in" strokeWidth={1.1} />
    <h2 className="mt-2 text-lg font-medium">No UTM templates found</h2>
    <p className="mt-2 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
      Create UTM templates to quickly add tracking parameters to your links
    </p>
  </div>
));

EmptyState.displayName = "EmptyState";

const ErrorState = memo(
  ({ error, onRetry }: { error: ApiError; onRetry: () => void }) => (
    <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center rounded border">
      <h2 className="mt-2 text-lg font-medium">Error loading templates</h2>
      <p className="mt-2 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
        {error.info?.error ??
          error.message ??
          "There was an error loading your templates. Please try again later."}
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

export default function UtmTemplatesClient({
  workspaceslug,
}: {
  workspaceslug: string;
}) {
  const {
    data: templates,
    error,
    isLoading,
    mutate,
  } = useSWR<UtmTemplate[], ApiError>(
    `/api/workspace/${workspaceslug}/utm-templates`,
  );

  const handleRetry = useCallback(() => {
    mutate();
  }, [mutate]);

  return (
    <div>
      <div className="flex items-center justify-end gap-4 pb-2">
        <Actions workspaceslug={workspaceslug} />
      </div>

      {isLoading && (
        <div className="flex h-[50vh] items-center justify-center">
          <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      )}

      {error && <ErrorState error={error} onRetry={handleRetry} />}

      {!isLoading && !error && (
        <>
          <div className="mt-6">
            {templates?.length === 0 && <EmptyState />}
          </div>
          <div className="mt-6 grid grid-cols-1 gap-2.5">
            {templates?.map((template) => (
              <UtmTemplateCard
                key={template.id}
                template={template}
                workspaceslug={workspaceslug}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
