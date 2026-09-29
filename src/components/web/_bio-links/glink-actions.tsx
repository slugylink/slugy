"use client";

import type React from "react";
import { useState, useCallback } from "react";
import {
  Trash2,
  Share2,
  Check,
  Copy,
  User,
  PencilLine,
  Images,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GLinkDialogBox } from "./add-glink-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GallerySettingsDialog from "./gallery-settings-dialog";
import GalleryImagesDialog from "./gallery-images-dialog";
import { SocialSettingsDialog } from "./social-settings-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
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
import GalleryProfileView, {
  resolveGalleryTheme,
} from "@/components/web/_bio-links/gallery-profile-view";
import { type KeyedMutator } from "swr";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { getAvatarUrl } from "@/utils/bio-links";
import type { EditorGallery, GalleryData } from "@/types/bio-links";

interface ActionsProps {
  gallery: EditorGallery;
  username: string;
  mutate: KeyedMutator<EditorGallery>;
}

const Actions = ({ gallery, username, mutate }: ActionsProps) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const router = useRouter();
  const isPublished = Boolean(gallery.isPublic);
  const previewThemeId =
    typeof gallery.theme === "string"
      ? gallery.theme
      : (gallery.theme?.id ?? null);

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

  const handleToggleVisibility = useCallback(
    async (next?: boolean) => {
      if (isTogglingVisibility) return;

      const target = next ?? !isPublished;
      setIsTogglingVisibility(true);
      try {
        const res = await fetch(`/api/bio-gallery/${username}/visibility`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublic: target }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          toast.error(data.error ?? "Failed to update visibility");
          return;
        }

        await mutate({ ...gallery, isPublic: target }, false);
        toast.success(
          target ? "Gallery published — it's live now" : "Gallery unpublished",
        );
      } catch (err) {
        console.error("Visibility toggle error:", err);
        toast.error("Failed to update visibility");
      } finally {
        setIsTogglingVisibility(false);
      }
    },
    [isPublished, isTogglingVisibility, username, gallery, mutate],
  );

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
        // Replace so the back button can't return to this deleted editor.
        router.replace("/bio-links");
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
        {username}
        <button
          className="flex cursor-pointer items-center justify-center focus:outline-none"
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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              role="switch"
              aria-checked={isPublished}
              aria-label={isPublished ? "Unpublish gallery" : "Publish gallery"}
              disabled={isTogglingVisibility}
              onClick={() => void handleToggleVisibility(!isPublished)}
              className={`relative h-5 w-8 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                isPublished ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600"
              }`}
            >
              <span
                aria-hidden
                className={`absolute top-0.5 left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow transition-transform duration-200 ${
                  isPublished ? "translate-x-3" : "translate-x-0"
                }`}
              >
                {isTogglingVisibility && (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                )}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isTogglingVisibility
              ? "Saving..."
              : isPublished
                ? "Published"
                : "Draft"}
          </TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="More options">
              <PencilLine className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              <span>Edit Bio</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSocialOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" />
              <span>Social Links</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGalleryOpen(true)}>
              <Images className="mr-2 h-4 w-4" />
              <span>Gallery Images</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className=""
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete Bio</span>
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

      {/* Gallery Images Dialog */}
      <GalleryImagesDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        username={username}
        images={gallery.images ?? []}
        mutate={mutate}
      />
      {/* Delete Gallery AlertDialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => !isDeleting && setDeleteDialogOpen(open)}
      >
        <AlertDialogContent className="bg-white p-4 sm:max-w-[425px] dark:bg-black">
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
    </div>
  );
};
export default Actions;
