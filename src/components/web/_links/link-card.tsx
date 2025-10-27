"use client";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EllipsisVertical,
  QrCode,
  LinkIcon,
  Trash,
  Archive,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import QRCodeDesign from "@/components/web/qr-code-design";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { mutate } from "swr";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

import {
  LinkPreviewComponent,
  CopyButton,
  DescriptionTooltip,
  AnalyticsBadge,
  SelectionCheckbox,
  LinkAvatar,
  DeleteConfirmationDialog,
} from "@/components/web/_links/link-card-components";
import { useWorkspaceStore } from "@/store/workspace";

// Dynamic import for Edit link form (no SSR)
const EditLinkForm = dynamic(
  () => import("@/components/web/_links/edit-link"),
  { ssr: false },
);

type DialogType = "dropdown" | "edit" | "qrCode" | "delete" | "shareAnalytics";

interface Creator {
  name: string | null;
  image: string | null;
}

interface LinkData {
  id: string;
  url: string;
  slug: string;
  clicks: number;
  description?: string | null;
  password?: string | null;
  createdAt?: Date | null;
  creatorId?: string | null;
  isArchived?: boolean;
  creator: Creator | null;
  domain?: string | null;
  expiresAt?: Date | null;
  tags?: Array<{
    tag: {
      id: string;
      name: string;
      color: string | null;
    };
  }> | null;
  expirationUrl?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  image?: string | null;
  title?: string | null;
  qrCode: {
    id: string;
    customization?: string;
  };
}

interface LinkCardProps {
  isPublic: boolean;
  workspaceslug?: string;
  link: LinkData;
  isSelectModeOn?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

const COPY_TIMEOUT = 2000;

// Dialog state hook (only opens/close specific dialogs)
const useDialogState = () => {
  const [openDialogs, setOpenDialogs] = useState<Set<DialogType>>(new Set());
  const toggleDialog = (dialog: DialogType, isOpen?: boolean) => {
    setOpenDialogs((prev) => {
      const newSet = new Set(prev);
      if (isOpen === false || (isOpen === undefined && newSet.has(dialog))) {
        newSet.delete(dialog);
      } else {
        newSet.add(dialog);
      }
      return newSet;
    });
  };
  const isDialogOpen = (dialog: DialogType) => openDialogs.has(dialog);
  return { toggleDialog, isDialogOpen };
};

const useLinkActions = (workspaceslug: string | undefined, linkId: string) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const mutateLinks = () => {
    return mutate(
      (key) => typeof key === "string" && key.includes("/link/get"),
      undefined,
      { revalidate: true },
    );
  };
  const handleArchive = async (isArchived: boolean) => {
    if (!workspaceslug || !linkId) return;
    try {
      const response = await axios.patch(
        `/api/workspace/${workspaceslug}/link/${linkId}/archive`,
        { isArchived: !isArchived },
      );
      if (response.status === 200) {
        toast.success(
          isArchived
            ? "Link unarchived successfully!"
            : "Link archived successfully!",
        );
        void mutateLinks();
      }
    } catch (error) {
      console.error("Archive error:", error);
      toast.error("Error updating link archive status. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!workspaceslug || !linkId) return;
    try {
      setIsDeleting(true);
      const response = await axios.delete(
        `/api/workspace/${workspaceslug}/link/${linkId}/delete`,
      );
      if (response.status === 200) {
        toast.success("Link deleted successfully!");
        void mutateLinks();
        router.refresh();
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Error deleting link. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };
  return { handleArchive, handleDelete, isDeleting };
};

// EditLinkForm data creation
const createEditFormData = (link: LinkData) => ({
  id: link.id,
  domain: link.domain ?? "slugy.co",
  url: link.url,
  slug: link.slug,
  description: link.description ?? "",
  password: link.password ?? "",
  expiresAt: link.expiresAt
    ? link.expiresAt instanceof Date
      ? link.expiresAt.toISOString()
      : link.expiresAt
    : null,
  tags: link.tags ? link.tags.map((t) => t.tag.name) : [],
  expirationUrl: link.expirationUrl ?? "",
  utm_source: link.utm_source ?? "",
  utm_medium: link.utm_medium ?? "",
  utm_campaign: link.utm_campaign ?? "",
  utm_content: link.utm_content ?? "",
  utm_term: link.utm_term ?? "",
  creatorId: typeof link.creatorId === "string" ? link.creatorId : undefined,
  image: link.image ?? "",
  title: link.title ?? "",
  qrCode: link.qrCode,
});

export default function LinkCard({
  link,
  isPublic,
  isSelectModeOn = false,
  isSelected = false,
  onSelect,
}: LinkCardProps) {
  const { workspaceslug } = useWorkspaceStore();
  const pathname = usePathname();
  const { toggleDialog, isDialogOpen } = useDialogState();
  const { handleArchive, handleDelete, isDeleting } = useLinkActions(
    workspaceslug!,
    link.id,
  );
  const [isCopied, setIsCopied] = useState(false);
  
  const shortUrl = `https://${link.domain || "slugy.co"}/${link.slug}`;
  const editFormData = createEditFormData(link);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setIsCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setIsCopied(false), COPY_TIMEOUT);
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  // Action handlers mapping
  const actionHandlers = {
    edit: () => {
      toggleDialog("edit", true);
      toggleDialog("dropdown", false);
    },
    qrCode: () => {
      toggleDialog("qrCode", true);
      toggleDialog("dropdown", false);
    },
    copy: async () => {
      await handleCopy();
      toggleDialog("dropdown", false);
    },
    archive: async () => {
      await handleArchive(link.isArchived ?? false);
      toggleDialog("dropdown", false);
    },
    delete: () => {
      toggleDialog("delete", true);
      toggleDialog("dropdown", false);
    },
  };

  // Dropdown menu items
  const dropdownItems = [
    { icon: Pencil, label: "Edit", onClick: actionHandlers.edit },
    { icon: QrCode, label: "QR Code", onClick: actionHandlers.qrCode },
    { icon: LinkIcon, label: "Copy link", onClick: actionHandlers.copy },
    { type: "separator" as const },
    {
      icon: Archive,
      label: link.isArchived ? "Unarchive" : "Archive",
      onClick: actionHandlers.archive,
    },
    {
      icon: Trash,
      label: "Delete",
      color: "text-destructive hover:text-destructive",
      onClick: actionHandlers.delete,
    },
  ];

  const handleCardClick = () => {
    if (isSelectModeOn && onSelect) onSelect();
  };

  const handleDeleteConfirm = async () => {
    await handleDelete();
    toggleDialog("delete", false);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex w-full flex-row items-start space-y-0 rounded-xl border p-4 transition-shadow hover:shadow-[0_0_16px_rgba(0,0,0,0.08)] sm:items-center sm:space-x-3",
          isSelectModeOn &&
            "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900",
          isSelected && "bg-zinc-50 dark:bg-zinc-900",
        )}
        onClick={handleCardClick}
      >
        {/* Avatar/Checkbox */}
        {isSelectModeOn ? (
          <SelectionCheckbox isSelected={isSelected} />
        ) : (
          <LinkAvatar isArchived={link.isArchived} url={link.url} />
        )}

        {/* Main Content */}
        <div className="min-w-0 flex-1 space-y-[6px]">
          <div className="flex items-center gap-2 sm:flex-row">
            <p
              className={cn(
                "max-w-[calc(100%-3rem)] truncate text-sm font-medium",
                link.isArchived && "text-muted-foreground",
              )}
            >
              {link.domain || "slugy.co"}/{link.slug}
            </p>
            <div className="flex items-center gap-2">
              <CopyButton isCopied={isCopied} onClick={handleCopy} />
              {link.description && (
                <DescriptionTooltip description={link.description} />
              )}
              {link.isArchived && (
                <Archive
                  size={15}
                  className="block text-zinc-500 sm:hidden dark:text-zinc-300"
                />
              )}
            </div>
          </div>
          <LinkPreviewComponent url={link.url} />
        </div>

        {/* Actions */}
        <div className="flex h-full w-auto items-center justify-end">
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="mr-3 hidden aspect-square size-[25px] rounded-full border bg-zinc-100/50 p-0 md:flex"
                  onClick={actionHandlers.qrCode}
                >
                  <QrCode className="max-h-[12.5px] max-w-[13px] text-black dark:text-white" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>QR Code</TooltipContent>
            </Tooltip>
          </div>
          <AnalyticsBadge
            clicks={link.clicks}
            isPublic={isPublic}
            pathname={pathname}
            slug={link.slug}
            onShareAnalytics={() => {}}
          />

          <DropdownMenu
            open={isDialogOpen("dropdown")}
            onOpenChange={(open) => toggleDialog("dropdown", open)}
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
                {dropdownItems.map((item, index) =>
                  item.type === "separator" ? (
                    <Separator key={`separator-${index}`} className="my-1" />
                  ) : (
                    <DropdownMenuItem
                      key={`${item.label}-${index}`}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-3 py-2",
                        item.color,
                      )}
                      onClick={item.onClick}
                    >
                      {item.icon && (
                        <item.icon
                          className={cn("size-4 p-[.4px]", item.color)}
                        />
                      )}
                      <span className={cn("text-sm", item.color)}>
                        {item.label}
                      </span>
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Dialogs */}
      {isDialogOpen("qrCode") && (
        <Dialog
          open={isDialogOpen("qrCode")}
          onOpenChange={(open) => toggleDialog("qrCode", open)}
        >
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-medium">
                QR Code Design
              </DialogTitle>
            </DialogHeader>
            <QRCodeDesign
              linkId={link.id}
              domain={link.domain || "slugy.co"}
              code={link.slug}
              onOpenChange={(open: boolean) => toggleDialog("qrCode", open)}
            />
          </DialogContent>
        </Dialog>
      )}
      {isDialogOpen("edit") && (
        <EditLinkForm
          initialData={editFormData}
          open={true}
          onOpenChange={toggleDialog.bind(null, "edit")}
          onClose={() => toggleDialog("edit", false)}
          date={link.createdAt!}
          creator={link.creator!}
        />
      )}
      <DeleteConfirmationDialog
        isOpen={isDialogOpen("delete")}
        onOpenChange={(open) => toggleDialog("delete", open)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </TooltipProvider>
  );
}
