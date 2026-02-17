"use client";

import { useState, useCallback, useMemo, memo } from "react";
import {
  CornerDownRight,
  EllipsisVertical,
  MousePointerClick,
  Edit,
  Trash,
  GripHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { type KeyedMutator } from "swr";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LinkPreview } from "@/components/ui/link-preview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog as UIDialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GLinkDialogBox } from "./add-glink-dialog";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { formatNumber } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import type { EditorBioLink, EditorGallery } from "@/types/bio-links";
import UrlAvatar from "@/components/web/url-avatar";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_LINK_IMAGE_URL =
  "https://res.cloudinary.com/dcsouj6ix/image/upload/v1771263620/default_t5ngb8.webp";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GalleryLinkCardProps {
  link: EditorBioLink;
  username: string;
  mutate: KeyedMutator<EditorGallery>;
}

interface EditData {
  id: string;
  title: string;
  url: string;
  style?: string | null;
}

type DialogKey = "dropdown" | "edit" | "delete";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const LinkPreviewRow = memo(({ url }: { url: string }) => (
  <div className="text-muted-foreground flex items-start gap-1 text-sm">
    <CornerDownRight strokeWidth={1.5} size={16} aria-hidden="true" />
    <LinkPreview
      url={url}
      className="text-muted-foreground max-w-[calc(100%-3rem)] cursor-pointer truncate hover:underline"
    >
      {stripProtocol(url)}
    </LinkPreview>
  </div>
));
LinkPreviewRow.displayName = "LinkPreviewRow";

const AnalyticsBadge = memo(({ clicks }: { clicks: number }) => (
  <Badge
    variant="outline"
    className="flex cursor-pointer items-center gap-x-1 bg-zinc-100 text-sm font-light shadow-none hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
  >
    <MousePointerClick size={16} strokeWidth={1.5} aria-hidden="true" />
    {formatNumber(clicks)}
    <span className="hidden sm:inline">clicks</span>
  </Badge>
));
AnalyticsBadge.displayName = "AnalyticsBadge";

interface LinkOptionsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: {
    icon: React.ElementType;
    label: string;
    color?: string;
    onClick: () => void;
  }[];
}

function LinkOptionsMenu({ open, onOpenChange, items }: LinkOptionsMenuProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-transparent"
          aria-label="Link options"
        >
          <EllipsisVertical className="text-black dark:text-white" size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          {items.map((item) => (
            <DropdownMenuItem
              key={item.label}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-3 py-2",
                item.color,
              )}
              onClick={item.onClick}
            >
              <item.icon
                className={cn("h-4 w-4", item.color)}
                aria-hidden="true"
              />
              <span className={cn("text-sm", item.color)}>{item.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function GalleryLinkCard({ link, username, mutate }: GalleryLinkCardProps) {
  const [dialogs, setDialogs] = useState<Record<DialogKey, boolean>>({
    dropdown: false,
    edit: false,
    delete: false,
  });
  const [editData, setEditData] = useState<EditData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublic, setIsPublic] = useState(link.isPublic);

  const isFeatureStyle =
    link.style === "feature" || link.style === "feature-grid-2";

  const updateDialog = useCallback((key: DialogKey, value: boolean) => {
    setDialogs((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Optimistic SWR update ──
  const patchCache = useCallback(
    (updater: (links: EditorBioLink[]) => EditorBioLink[]) => {
      void mutate(
        (current) =>
          current ? { ...current, links: updater(current.links) } : current,
        { revalidate: false },
      );
    },
    [mutate],
  );

  // ── Delete ──
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    patchCache((links) => links.filter((l) => l.id !== link.id));

    try {
      await axios.delete(`/api/bio-gallery/${username}/link/${link.id}`);
      toast.success("Link deleted");
    } catch (err) {
      console.error("[GalleryLinkCard] Delete error:", err);
      toast.error("Failed to delete link. Please try again.");
      void mutate();
    } finally {
      setIsDeleting(false);
      updateDialog("delete", false);
    }
  }, [link.id, username, mutate, patchCache, updateDialog]);

  // ── Toggle visibility ──
  const handleTogglePublic = useCallback(
    async (checked: boolean) => {
      setIsPublic(checked);
      patchCache((links) =>
        links.map((l) => (l.id === link.id ? { ...l, isPublic: checked } : l)),
      );

      try {
        await axios.patch(`/api/bio-gallery/${username}/link/${link.id}`, {
          isPublic: checked,
        });
      } catch (err) {
        console.error("[GalleryLinkCard] Toggle public error:", err);
        setIsPublic(!checked);
        toast.error("Failed to update visibility.");
        void mutate();
      }
    },
    [link.id, username, mutate, patchCache],
  );

  // ── Dropdown items ──
  const dropdownItems = useMemo(
    () => [
      {
        icon: Edit,
        label: "Edit",
        onClick: () => {
          setEditData({
            id: link.id,
            title: link.title,
            url: link.url,
            style: link.style,
          });
          updateDialog("edit", true);
          updateDialog("dropdown", false);
        },
      },
      {
        icon: Trash,
        label: "Delete",
        color: "text-destructive hover:text-destructive",
        onClick: () => {
          updateDialog("delete", true);
          updateDialog("dropdown", false);
        },
      },
    ],
    [link.id, link.title, link.url, link.style, updateDialog],
  );

  const optionsMenu = (
    <LinkOptionsMenu
      open={dialogs.dropdown}
      onOpenChange={(open) => updateDialog("dropdown", open)}
      items={dropdownItems}
    />
  );

  return (
    <div className="mx-auto w-[calc(100vw-1.5rem)] touch-manipulation overflow-hidden rounded-xl transition-shadow select-none hover:shadow-[0_0_16px_rgba(0,0,0,0.08)] sm:w-full">
      {isFeatureStyle ? (
        // ── Feature card layout ──
        <div className="bg-background border-muted-foreground space-y-1 border">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5 p-1">
              <div className="block cursor-grab p-1" aria-hidden="true">
                <GripHorizontal size={20} className="text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={isPublic}
                onCheckedChange={handleTogglePublic}
                aria-label="Toggle link visibility"
              />
              {optionsMenu}
            </div>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-lg">
            <img
              src={link.image ?? DEFAULT_LINK_IMAGE_URL}
              alt={link.title || "Feature link preview"}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <div
              className="absolute inset-0 z-10 bg-linear-to-t from-black/80 via-black/20 to-transparent"
              aria-hidden="true"
            />
            <span className="absolute top-3 left-3 z-20 rounded-full shadow-sm">
              <UrlAvatar className="size-8 p-1.5 shadow" url={link.url} />
            </span>
            <p className="md:text-md absolute inset-x-0 bottom-2.5 z-20 line-clamp-1 px-4 text-center text-base leading-tight font-semibold text-white drop-shadow-sm">
              {link.title || link.url}
            </p>
          </div>
        </div>
      ) : (
        // ── Standard link layout ──
        <div className="bg-background flex flex-row items-center space-x-3 px-1 py-5">
          <div className="block cursor-grab p-1" aria-hidden="true">
            <GripHorizontal size={20} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-primary truncate text-sm leading-none font-medium">
              {link.title}
            </p>
            <LinkPreviewRow url={link.url} />
          </div>
          <div className="flex h-full items-center gap-2">
            <Switch
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              aria-label="Toggle link visibility"
            />
            {optionsMenu}
          </div>
        </div>
      )}

      {/* ── Edit dialog ── */}
      {editData && (
        <GLinkDialogBox
          username={username}
          initialData={editData}
          open={dialogs.edit}
          onOpenChange={(open) => {
            updateDialog("edit", open);
            if (!open) setEditData(null);
          }}
        />
      )}

      {/* ── Delete confirmation dialog ── */}
      {dialogs.delete && (
        <UIDialog
          open={dialogs.delete}
          onOpenChange={(open) => updateDialog("delete", open)}
        >
          <DialogContent className="bg-white sm:max-w-[425px] dark:bg-black">
            <DialogHeader>
              <DialogTitle>Delete Link</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">
              Are you sure you want to delete this link? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => updateDialog("delete", false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting && (
                  <LoaderCircle
                    className="mr-1 h-5 w-5 animate-spin"
                    aria-hidden="true"
                  />
                )}
                Delete
              </Button>
            </div>
          </DialogContent>
        </UIDialog>
      )}
    </div>
  );
}

export default GalleryLinkCard;
