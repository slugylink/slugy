"use client";

import { useState } from "react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mutate } from "swr";
import { EllipsisVertical, KeyRound, Trash } from "lucide-react";
import { toast } from "sonner";
import { LoaderCircle } from "@/utils/icons/loader-circle";

export interface WorkspaceApiKeyItem {
  id: string;
  name: string;
  keyPreview: string;
  createdAt: string;
  lastUsed: string | null;
  expiresAt: string | null;
  permissionLevel: string;
  linksPermission: string;
}

function formatRelativeDate(date: string | null) {
  if (!date) return "Never";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export default function WorkspaceApiKeyCard({
  apiKey,
  workspaceslug,
}: {
  apiKey: WorkspaceApiKeyItem;
  workspaceslug: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await axios.delete(
        `/api/workspace/${workspaceslug}/settings/api-keys?apiKeyId=${apiKey.id}`,
      );
      toast.success("API key deleted successfully");
      await mutate(`/api/workspace/${workspaceslug}/settings/api-keys`);
    } catch (error) {
      console.error("Failed to delete API key:", error);
      toast.error("Failed to delete API key");
    } finally {
      setIsDeleting(false);
      setIsDropdownOpen(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 rounded-xl border p-3 text-sm transition-shadow hover:shadow-[0_0_10px_0_rgba(0,0,0,0.07)]">
        <div className="flex items-center gap-2">
          <div className="bg-muted flex w-fit items-center gap-2 rounded-full border p-2">
            <KeyRound className="text-muted-foreground h-4 w-4 p-[1px]" />
          </div>
          <div className="space-y-1">
            <div>{apiKey.name}</div>
            <p className="text-muted-foreground font-mono text-xs">
              {apiKey.keyPreview}
            </p>
            <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
              <span>Created {formatRelativeDate(apiKey.createdAt)}</span>
              <span>Last used {formatRelativeDate(apiKey.lastUsed)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            className="flex items-center justify-center rounded-sm bg-zinc-100/50 text-xs font-normal text-zinc-700 shadow-none hover:bg-zinc-200/50 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
            variant="outline"
          >
            Link write
          </Badge>

          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-transparent"
                aria-label="API key options"
                disabled={isDeleting}
              >
                <EllipsisVertical
                  className="text-black dark:text-white"
                  size={16}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="text-destructive hover:text-destructive flex cursor-pointer items-center gap-2 px-3"
                  onClick={() => {
                    setIsDeleteDialogOpen(true);
                    setIsDropdownOpen(false);
                  }}
                  disabled={isDeleting}
                >
                  <Trash className="text-destructive h-3 w-3" />
                  <span className="text-destructive text-sm">Delete</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-white sm:max-w-[425px] dark:bg-black">
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the API key &ldquo;{apiKey.name}
              &rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
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
                <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
