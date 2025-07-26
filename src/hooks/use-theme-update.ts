import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useThemeStore } from "@/store/theme-store";

export function useThemeUpdate(
  username: string,
  initialTheme: string,
  onThemeChange?: (theme: string) => void
) {
  const [isSaving, setIsSaving] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const router = useRouter();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const previousTheme = useRef(initialTheme);

  // Immediately apply the theme and show toast for confirmation/cancellation
  const handleThemeClick = (themeId: string, currentTheme: string) => {
    if (themeId === currentTheme) return;
    previousTheme.current = currentTheme;
    setTheme(themeId);
    setPendingTheme(themeId);
    onThemeChange?.(themeId);
  };

  // Confirm theme change: persist to server
  const handleConfirmTheme = async () => {
    if (!pendingTheme) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/bio-gallery/${username}/update/theme`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: pendingTheme }),
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
      toast.success("Theme updated successfully");
      router.refresh();
      setIsSheetOpen(false);
      setPendingTheme(null);
    } catch (err: unknown) {
      let message = "Failed to update theme";
      if (err instanceof Error) {
        message = err.message;
      }
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel theme change: revert to previous theme
  const handleCancelTheme = () => {
    setTheme(previousTheme.current);
    setPendingTheme(null);
    onThemeChange?.(previousTheme.current);
  };

  return {
    isSaving,
    pendingTheme,
    isSheetOpen,
    setIsSheetOpen,
    theme,
    handleThemeClick,
    handleConfirmTheme,
    handleCancelTheme,
    previousTheme: previousTheme.current,
  };
} 