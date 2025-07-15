import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useThemeStore } from "@/store/theme-store";

export function useThemeUpdate(username: string, initialTheme: string, onThemeChange?: (theme: string) => void) {
  const [isSaving, setIsSaving] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const router = useRouter();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  // Initialize theme from initialTheme if needed
  // (optional: only if you want to sync with server on mount)
  // React.useEffect(() => { setTheme(initialTheme); }, [initialTheme, setTheme]);

  const handleThemeClick = (themeId: string, currentTheme: string) => {
    if (themeId === currentTheme) return;
    setPendingTheme(themeId);
    setIsDialogOpen(true);
  };

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
      if (typeof pendingTheme === "string") {
        setTheme(pendingTheme);
        onThemeChange?.(pendingTheme);
      }
      toast.success("Theme updated successfully");
      router.refresh();
      setIsSheetOpen(false);
    } catch (err: unknown) {
      let message = "Failed to update theme";
      if (err instanceof Error) {
        message = err.message;
      }
      toast.error(message);
    } finally {
      setIsSaving(false);
      setIsDialogOpen(false);
      setPendingTheme(null);
    }
  };

  return {
    isSaving,
    pendingTheme,
    isDialogOpen,
    setIsDialogOpen,
    isSheetOpen,
    setIsSheetOpen,
    theme,
    handleThemeClick,
    handleConfirmTheme,
  };
} 