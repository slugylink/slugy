import React, { useCallback, useEffect, useState } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { LAYOUT_OPTIONS, LayoutOption } from "@/constants/links";

// Custom hook for layout preference with smooth transitions
export const useLayoutPreference = () => {
  const [layout, setLayout] = useState("grid-cols-1");
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLayout = window.localStorage.getItem("layout") as LayoutOption | null;
      const initialLayout = savedLayout && LAYOUT_OPTIONS.some((o) => o.value === savedLayout)
        ? savedLayout
        : "grid-cols-1";
      setLayout(initialLayout);
    }
  }, []);

  const enhancedSetLayout = useCallback((value: React.SetStateAction<string>) => {
    const newLayout = typeof value === 'function' ? value(layout) : value;

    if (newLayout === layout) return;

    setIsTransitioning(true);

    // Add a small delay for smoother transition
    setTimeout(() => {
      setLayout(newLayout);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("layout", newLayout);
        // Dispatch custom event to notify other components of layout change
        window.dispatchEvent(new CustomEvent("layoutChange"));
      }

      // Reset transition state after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
      }, 350); // Slightly longer than the CSS transition duration
    }, 50);
  }, [layout]);

  return { layout, setLayout: enhancedSetLayout, isTransitioning };
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
