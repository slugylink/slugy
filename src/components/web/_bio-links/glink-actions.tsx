"use client";

import type React from "react";
import { useState, useCallback } from "react";
import {
  EllipsisVertical,
  Settings,
  Trash2,
  Share2,
  Paintbrush,
  Check,
  Smartphone,
  Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GLinkDialogBox } from "./add-glink-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GallerySettingsDialog from "./gallery-settings-dialog";
import { SocialSettingsDialog } from "./social-settings-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { themes } from "@/constants/theme";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useThemeUpdate } from "@/hooks/use-theme-update";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import GalleryLinkPreview from "./glink-preview";
import { type KeyedMutator } from "swr";
import { LoaderCircle } from "@/utils/icons/loader-circle";

interface Link {
  id: string;
  title: string;
  url: string;
  isPublic: boolean;
  position: number;
  clicks: number;
  galleryId: string;
}

interface Gallery {
  links: Link[];
  username: string;
  name?: string | null;
  bio?: string | null;
  logo?: string | null;
  socials?: {
    platform: string;
    url?: string;
    isPublic?: boolean;
  }[];
  theme?: string;
}

interface ActionsProps {
  gallery: Gallery;
  username: string;
  mutate: KeyedMutator<Gallery>;
}

const Actions = ({ gallery, username }: ActionsProps) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const {
    isSaving,
    pendingTheme,
    isDialogOpen,
    setIsDialogOpen,
    isSheetOpen,
    setIsSheetOpen,
    theme,
    handleThemeClick,
    handleConfirmTheme,
  } = useThemeUpdate(username, gallery.theme ?? "music");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const router = useRouter();

  const shortUrl = `https://bio.slugy.co/${username}`;

  const handleCopy = useCallback(async () => {
    if (isCopying) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(shortUrl);
      setIsCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Copy error:", err);
      toast.error("Failed to copy to clipboard");
    } finally {
      setIsCopying(false);
    }
  }, [shortUrl, isCopying]);

  const handleDeleteGallery = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/bio-gallery/${username}/update`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Gallery deleted successfully");
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Failed to delete gallery");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete gallery");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <Badge
        variant="secondary"
        className="flex h-8 items-center gap-2 text-sm font-normal"
      >
        @{username}
        <button
          className="flex items-center justify-center focus:outline-none"
          onClick={handleCopy}
          disabled={isCopying}
          aria-label="Copy gallery link"
        >
          {isCopied ? (
            <Check className="size-4 text-green-500" strokeWidth={1.5} />
          ) : (
            <Copy className="size-4 p-[1.5px]" strokeWidth={1.8} />
          )}
        </button>
      </Badge>

      <div className="flex items-center gap-2">
        <GLinkDialogBox username={username} />

        <Button
          onClick={() => setIsSheetOpen(true)}
          variant="outline"
          size="icon"
          className="h-9 w-9"
          aria-label="Change theme"
        >
          <Paintbrush strokeWidth={1.5} className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label="More options"
            >
              <EllipsisVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Edit Gallery</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSocialOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" />
              <span>Social Links</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete Gallery</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Gallery Settings Dialog */}
      <GallerySettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        username={username}
        initialData={gallery}
      />

      {/* Social Settings Dialog */}
      <SocialSettingsDialog
        open={socialOpen}
        onOpenChange={setSocialOpen}
        username={username}
        initialData={gallery.socials}
      />

      {/* Theme Selection Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="w-full max-w-2xl">
          <SheetHeader>
            <SheetTitle>Choose a Theme</SheetTitle>
          </SheetHeader>
          <div className="grid max-h-[calc(100vh-8rem)] grid-cols-3 gap-4 overflow-y-auto py-8 pr-2 md:grid-cols-3">
            {themes.map((t) => (
              <button
                key={t.id}
                className={cn(
                  "group relative aspect-[9/16] overflow-hidden rounded-lg border-2 transition-all hover:border-primary",
                  t.id === theme
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-muted-foreground/20",
                )}
                onClick={() => handleThemeClick(t.id, theme)}
                aria-label={`Select ${t.name} theme`}
                aria-pressed={t.id === theme}
              >
                {/* Theme Preview */}
                <div className={cn("h-full w-full", t.background)}>
                  {/* Mock Content */}
                  <div className="flex flex-col items-center gap-2 p-4">
                    <div className="h-8 w-8 rounded-full bg-zinc-300/20" />
                    <div className="h-4 w-16 rounded-full bg-zinc-300/20" />
                    <div className="mt-4 space-y-2">
                      <div className="h-8 w-full rounded-full bg-zinc-300/20" />
                      <div className="h-8 w-full rounded-full bg-zinc-300/20" />
                      <div className="h-8 w-full rounded-full bg-zinc-300/20" />
                    </div>
                  </div>
                </div>
                {/* Theme Name */}
                <div
                  className={cn(
                    "absolute bottom-2 left-2 rounded bg-black/80 px-2 py-1 text-xs text-white",
                    t.id === theme && "bg-primary",
                  )}
                >
                  {t.name}
                </div>
                {/* Selected Check */}
                {t.id === theme && (
                  <div className="absolute right-2 top-2 rounded-full bg-primary p-1">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm Theme Change Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => !isSaving && setIsDialogOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Theme?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to change your theme to{" "}
            <strong>
              {pendingTheme && themes.find((t) => t.id === pendingTheme)?.name}
            </strong>
            ?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmTheme} disabled={isSaving}>
              {isSaving && (
                <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
              )}{" "}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Gallery AlertDialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => !isDeleting && setDeleteDialogOpen(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gallery</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this gallery? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant={"destructive"}
              disabled={isDeleting}
              onClick={handleDeleteGallery}
            >
              {isDeleting && (
                <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
              )}{" "}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Preview Button */}
      <div className="fixed bottom-3 right-3 z-50 block sm:hidden">
        <Button
          className="size-12 rounded-full shadow-lg transition-all hover:shadow-xl"
          onClick={() => setPreviewOpen(true)}
          aria-label="Preview gallery"
        >
          <Smartphone className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Preview Sheet */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Gallery Preview</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex h-full flex-col">
            <div className="flex-1 overflow-auto p-4">
              <div className="flex justify-center">
                <GalleryLinkPreview
                  username={username}
                  links={gallery.links.filter((link) => link.isPublic)}
                  socials={gallery.socials?.filter((s) => s.isPublic) ?? []}
                  name={gallery.name}
                  bio={gallery.bio}
                  logo={gallery.logo}
                  initialTheme={gallery.theme ?? "default"}
                />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
export default Actions;
