"use client";
import { useState, useCallback, useMemo, memo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CornerDownRight,
  EllipsisVertical,
  MousePointerClick,
  Edit,
  Trash,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LinkPreview } from "@/components/ui/link-preview";
import { formatNumber } from "@/lib/format-number";
import { Switch } from "@/components/ui/switch";
import { GLinkDialogBox } from "./add-glink-dialog";
import {
  Dialog as UIDialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import axios from "axios";
import { type KeyedMutator } from "swr";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { cn } from "@/lib/utils";

interface Link {
  id: string;
  title: string;
  url: string;
  galleryId: string;
  position: number;
  clicks: number;
  isPublic: boolean;
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

interface GalleryLinkCardProps {
  link: Link;
  username: string;
  mutate: KeyedMutator<Gallery>;
}

// Memoize the link preview component
const LinkPreviewComponent = memo(({ url }: { url: string }) => (
  <div className="flex items-start gap-1 text-sm text-muted-foreground">
    <CornerDownRight strokeWidth={1.5} size={16} />
    <LinkPreview
      url={url}
      className="max-w-[calc(100%-3rem)] cursor-pointer truncate text-muted-foreground hover:underline"
    >
      {url.replace("https://", "").replace("http://", "").replace("www.", "")}
    </LinkPreview>
  </div>
));

LinkPreviewComponent.displayName = "LinkPreviewComponent";

// Memoize the analytics badge component
const AnalyticsBadge = memo(({ clicks }: { clicks: number }) => (
  <Badge
    variant="outline"
    className="flex cursor-pointer items-center justify-center gap-x-1 bg-zinc-100 text-sm font-light shadow-none hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
  >
    <div className="flex items-center justify-center gap-x-1">
      <MousePointerClick size={16} strokeWidth={1.5} />
      {formatNumber(clicks)}
      <span className="hidden sm:inline">clicks</span>
    </div>
  </Badge>
));

AnalyticsBadge.displayName = "AnalyticsBadge";

function GalleryLinkCard({ link, username, mutate }: GalleryLinkCardProps) {
  const [dialogs, setDialogs] = useState({
    dropdown: false,
    edit: false,
    delete: false,
  });
  const [editData, setEditData] = useState<{
    id: string;
    title: string;
    url: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublic, setIsPublic] = useState(link.isPublic);

  // Create helper functions to update dialog states
  const updateDialog = useCallback(
    (dialog: keyof typeof dialogs, value: boolean) => {
      setDialogs((prev) => ({ ...prev, [dialog]: value }));
    },
    [],
  );

  const handleDeleteLink = useCallback(async () => {
    try {
      setIsDeleting(true);

      // Optimistically update the UI
      void mutate(
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            links: currentData.links.filter((l) => l.id !== link.id),
          };
        },
        { revalidate: false },
      );

      await axios.delete(`/api/bio-gallery/${username}/link/${link.id}`);
      toast.success("Link deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Error deleting link. Please try again.");
      // Revalidate to restore the original state
      void mutate();
    } finally {
      setIsDeleting(false);
      updateDialog("delete", false);
    }
  }, [mutate, username, link.id, updateDialog]);

  // Handle isPublic toggle
  const handleTogglePublic = async (checked: boolean) => {
    // Optimistically update the UI
    setIsPublic(checked);

    try {
      void mutate(
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            links: currentData.links.map((l) =>
              l.id === link.id ? { ...l, isPublic: checked } : l,
            ),
          };
        },
        { revalidate: false },
      );

      await axios.patch(`/api/bio-gallery/${username}/link/${link.id}`, {
        isPublic: checked,
      });
      // toast.success(checked ? "Link is now public" : "Link is now private");
    } catch (error) {
      setIsPublic(!checked); // revert
      toast.error("Failed to update public status");
      // Revalidate to restore the original state
      void mutate();
    }
  };

  // Memoize dropdown items to prevent unnecessary re-renders
  const dropdownItems = useMemo(
    () => [
      {
        icon: Edit,
        label: "Edit",
        onClick: () => {
          setEditData({ id: link.id, title: link.title, url: link.url });
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
    [updateDialog, link],
  );

  return (
    <div className="mx-auto flex w-[calc(100vw-1.5rem)] touch-manipulation select-none flex-row items-center space-x-3 space-y-0 rounded-xl border p-2 py-4 transition-shadow hover:shadow-[0_0_16px_rgba(0,0,0,0.08)] sm:w-full sm:p-4">
      <div className="block cursor-grab p-1">
        <GripVertical size={20} />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2 sm:flex-row">
          <p className="truncate text-sm font-medium leading-none">
            {link.title}
          </p>
        </div>
        <LinkPreviewComponent url={link.url} />
      </div>
      <div className="flex h-full w-auto items-center justify-end gap-2">
        <div className="cursor-pointer">
          <Switch className="" checked={isPublic} onCheckedChange={handleTogglePublic} />
        </div>
        <DropdownMenu
          open={dialogs.dropdown}
          onOpenChange={(open) => updateDialog("dropdown", open)}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-transparent"
              aria-label="Link options"
            >
              <EllipsisVertical
                className="text-black dark:text-white"
                size={16}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              {dropdownItems.map((item, index) => (
                <DropdownMenuItem
                  key={index}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 ${item.color ?? ""}`}
                  onClick={item.onClick}
                >
                  {item.icon && <item.icon className={cn("h-4 w-4", item.color)} />}
                  <span className={cn("text-sm", item.color)}>{item.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Edit Link Dialog */}
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
      {/* Delete Link Dialog */}
      {dialogs.delete && (
        <UIDialog
          open={dialogs.delete}
          onOpenChange={(open) => updateDialog("delete", open)}
        >
          <DialogContent className="bg-white dark:bg-black sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Link</DialogTitle>
            </DialogHeader>
            <div>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this link? This action cannot be
                undone.
              </p>
            </div>
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
                onClick={handleDeleteLink}
                disabled={isDeleting}
              >
                {isDeleting && (
                  <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
                )}{" "}
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
