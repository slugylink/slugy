import { useCallback, useEffect, useState } from "react";
import { mutate } from "swr";
import { toast } from "sonner";

// Custom hook for layout preference
export const useLayoutPreference = () => {
  const [layout, setLayout] = useState("grid-cols-1");

  useEffect(() => {
    const cookieLayout =
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("layout="))
        ?.split("=")[1] ?? "grid-cols-1";
    setLayout(cookieLayout);
  }, []);

  return { layout, setLayout };
};

// Generic bulk operation handler using SWR
export const useBulkOperation = (workspaceslug: string) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const executeOperation = useCallback(
    async (operation: "archive" | "delete", linkIds: string[]) => {
      if (linkIds.length === 0) return;

      setIsProcessing(true);

      const operationText = operation === "archive" ? "archiving" : "deleting";
      const operationPast = operation === "archive" ? "archived" : "deleted";

      const promise = (async () => {
        const response = await fetch(
          `/api/workspace/${workspaceslug}/link/${operation}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ linkIds }),
          },
        );

        if (!response.ok) {
          const error = (await response.json()) as { message?: string };
          throw new Error(error.message ?? `Failed to ${operation} links`);
        }

        const result = (await response.json()) as { message?: string };

        void mutate(
          (key) => typeof key === "string" && key.includes("/link/get"),
        );

        return (
          result.message ??
          `Successfully ${operationPast} ${linkIds.length} ${linkIds.length === 1 ? "link" : "links"}`
        );
      })();

      toast.promise(promise, {
        loading: `${operationText.charAt(0).toUpperCase() + operationText.slice(1)} ${linkIds.length} ${linkIds.length === 1 ? "link" : "links"}...`,
        success: (message: string) => message,
        error: (error: Error) =>
          error.message || `Failed to ${operation} links`,
      });

      promise.finally(() => {
        setIsProcessing(false);
      });
    },
    [workspaceslug],
  );

  return { isProcessing, executeOperation };
};
