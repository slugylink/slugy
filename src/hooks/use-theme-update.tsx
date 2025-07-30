import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useThemeStore } from "@/store/theme-store";
import { ThemeConfirmToast } from "@/components/ui/theme-confirm-toast";

export function useThemeUpdate(username: string, initialTheme: string, onThemeChange?: (theme: string) => void) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const router = useRouter();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  
  const handleThemeClick = (themeId: string, currentTheme: string) => {
    if (themeId === currentTheme) return;
    
    // Update theme store immediately to show in preview
    setTheme(themeId);
    
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
            toast.dismiss(t);
          }}
          onConfirm={() => {
            handleConfirmTheme(themeId);
            toast.dismiss(t);
          }}
        />
      ),
      {
        duration: 8000,
      }
    );
  };

  const handleConfirmTheme = async (themeId: string) => {
    if (!themeId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/bio-gallery/${username}/update/theme`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeId }),
      });
      if (!res.ok) {
        const data: unknown = await res.json();
        let errorMsg = "Failed to update theme";
        if (
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as { error?: unknown }).error === "string"
        ) {
          errorMsg = (data as { error: string }).error;
        }
        throw new Error(errorMsg);
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
      setTheme(initialTheme);
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