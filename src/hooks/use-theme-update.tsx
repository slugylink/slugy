import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useThemeStore } from "@/store/theme-store";
import { ThemeConfirmToast } from "@/components/ui/theme-confirm-toast";
import { KeyedMutator } from "swr";
import type { EditorGallery } from "@/types/bio-links";

export function useThemeUpdate(
  username: string,
  initialTheme: string,
  onThemeChange?: (theme: string) => void,
  mutate?: KeyedMutator<EditorGallery>,
) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const router = useRouter();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const updateCacheTheme = (themeId: string) => {
    if (!mutate) return;
    void mutate(
      (current) => (current ? { ...current, theme: themeId } : current),
      { revalidate: false },
    );
  };

  const handleThemeClick = (themeId: string, currentTheme: string) => {
    if (themeId === currentTheme) return;

    // Update theme store + preview cache immediately
    setTheme(themeId);
    updateCacheTheme(themeId);

    // Close the sheet
    setIsSheetOpen(false);

    // Show toast with confirm/cancel buttons
    toast.custom(
      (t) => (
        <ThemeConfirmToast
          themeId={themeId}
          onCancel={() => {
            // Revert theme on cancel
            setTheme(currentTheme);
            updateCacheTheme(currentTheme);
            toast.dismiss(t);
          }}
          onConfirm={() => {
            handleConfirmTheme(themeId, currentTheme);
            toast.dismiss(t);
          }}
        />
      ),
      {
        duration: 8000,
      },
    );
  };

  const handleConfirmTheme = async (
    themeId: string,
    currentTheme: string = initialTheme,
  ) => {
    if (!themeId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/bio-gallery/${username}/update/theme`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeId }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        let errorMsg = "Failed to update theme";
        if (
          responseData &&
          typeof responseData === "object" &&
          "error" in responseData &&
          typeof (responseData as { error?: unknown }).error === "string"
        ) {
          errorMsg = (responseData as { error: string }).error;
        }
        throw new Error(errorMsg);
      }

      // Update the cache with the new theme - use API response data if available
      if (mutate) {
        try {
          // If we have updated gallery data from the API, use it
          if (responseData.gallery) {
            mutate(responseData.gallery, false); // false prevents revalidation
          } else {
            // Fallback: just update the theme field
            mutate((currentData) => {
              if (!currentData) return currentData;
              return {
                ...currentData,
                theme: themeId,
              };
            }, false); // false prevents revalidation
          }
        } catch (cacheError) {
          console.error("Failed to update cache:", cacheError);
        }
      }

      onThemeChange?.(themeId);
      router.refresh();
    } catch (err: unknown) {
      let message = "Failed to update theme";
      if (err instanceof Error) {
        message = err.message;
      }
      toast.error(message);
      // Revert theme on error
      setTheme(currentTheme);
      updateCacheTheme(currentTheme);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    isSheetOpen,
    setIsSheetOpen,
    theme,
    handleThemeClick,
    handleConfirmTheme,
  };
}
