"use client";

import { Palette } from "lucide-react";
import { themes } from "@/constants/theme";
import { DEFAULT_THEME_ID } from "@/constants/bio-links";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useThemeUpdate } from "@/hooks/use-theme-update";
import { resolveGalleryTheme } from "./gallery-profile-view";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { cn } from "@/lib/utils";
import { type KeyedMutator } from "swr";
import type { EditorGallery } from "@/types/bio-links";

interface ThemePickerProps {
  username: string;
  initialTheme?: string | null;
  mutate?: KeyedMutator<EditorGallery>;
}

export default function ThemePicker({
  username,
  initialTheme,
  mutate,
}: ThemePickerProps) {
  const currentTheme = initialTheme ?? DEFAULT_THEME_ID;
  const { isSaving, isSheetOpen, setIsSheetOpen, handleThemeClick } =
    useThemeUpdate(username, currentTheme, undefined, mutate);

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2"
          aria-label="Change theme"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Choose a theme</SheetTitle>
          <SheetDescription>
            Pick a look for your bio page. Changes are previewed live.
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 overflow-y-auto px-4 pb-4 sm:grid-cols-3">
          {themes.map((theme) => {
            const isActive = theme.id === currentTheme;
            const preview = resolveGalleryTheme(theme.id);

            return (
              <button
                key={theme.id}
                type="button"
                disabled={isSaving}
                onClick={() => handleThemeClick(theme.id, currentTheme)}
                aria-pressed={isActive}
                className={cn(
                  "group relative overflow-hidden rounded-xl border text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                  isActive
                    ? "border-primary ring-primary/40 ring-2"
                    : "hover:border-primary/50",
                )}
              >
                <div
                  className={cn("h-20 w-full bg-zinc-100", preview.background)}
                />
                <span className="block truncate px-2 py-2 text-xs font-medium">
                  {theme.name}
                </span>
              </button>
            );
          })}
        </div>

        {isSaving && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 pb-4 text-xs">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Saving...
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
