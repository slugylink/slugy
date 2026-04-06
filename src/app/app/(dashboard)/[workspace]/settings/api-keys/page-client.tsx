"use client";

import { memo, useCallback } from "react";
import useSWR from "swr";
import axios from "axios";
import { KeyRound } from "lucide-react";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import WorkspaceApiKeyActions from "@/components/web/_settings/workspace-api-key-actions";
import WorkspaceApiKeyCard, {
  type WorkspaceApiKeyItem,
} from "@/components/web/_settings/workspace-api-key-card";

interface ApiError extends Error {
  info?: {
    error?: string;
  };
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

async function fetchApiKeys(url: string): Promise<WorkspaceApiKeyItem[]> {
  const response =
    await axios.get<ApiSuccessResponse<WorkspaceApiKeyItem[]>>(url);

  return response.data.data;
}

const EmptyState = memo(() => (
  <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center rounded-xl border">
    <KeyRound size={60} className="animate-fade-in" strokeWidth={1.1} />
    <h2 className="mt-2 text-lg font-medium">No API keys found</h2>
    <p className="mt-2 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
      Create an API key to let external apps send conversion events
    </p>
  </div>
));

EmptyState.displayName = "EmptyState";

const ErrorState = memo(
  ({ error, onRetry }: { error: ApiError; onRetry: () => void }) => (
    <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center rounded border">
      <h2 className="mt-2 text-lg font-medium">Error loading API keys</h2>
      <p className="mt-2 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
        {error.info?.error ??
          error.message ??
          "There was an error loading your API keys. Please try again later."}
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

export default function ApiKeysClient({
  workspaceslug,
  initialApiKeys,
}: {
  workspaceslug: string;
  initialApiKeys: WorkspaceApiKeyItem[];
}) {
  const {
    data: apiKeys,
    error,
    isLoading,
    mutate,
  } = useSWR<WorkspaceApiKeyItem[], ApiError>(
    `/api/workspace/${workspaceslug}/settings/api-keys`,
    fetchApiKeys,
    {
      fallbackData: initialApiKeys,
      revalidateOnMount: false,
    },
  );

  const handleRetry = useCallback(() => {
    mutate();
  }, [mutate]);

  return (
    <div>
      <WorkspaceApiKeyActions workspaceslug={workspaceslug} />

      {isLoading && (
        <div className="flex h-[50vh] items-center justify-center">
          <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      )}

      {error && <ErrorState error={error} onRetry={handleRetry} />}

      {!isLoading && !error && (
        <>
          <div className="mt-6">{apiKeys?.length === 0 && <EmptyState />}</div>
          <div className="mt-6 grid grid-cols-1 gap-2.5">
            {apiKeys?.map((apiKey) => (
              <WorkspaceApiKeyCard
                key={apiKey.id}
                apiKey={apiKey}
                workspaceslug={workspaceslug}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
