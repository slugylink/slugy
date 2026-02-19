import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pencil, EllipsisVertical, Tag, Trash } from "lucide-react";
import React, { useState } from "react";
import { COLOR_OPTIONS } from "@/constants/tag-colors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";
import { mutate } from "swr";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import CreateTagForm from "@/components/web/_tags/create-tag-dialog";

interface TagCardProps {
  tag: {
    id: string;
    name: string;
    color: string | null;
    linkCount: number;
  };
  workspaceslug: string;
}

const TagCard = ({ tag, workspaceslug }: TagCardProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Find matching color or use the first color as default
  const colorOption =
    COLOR_OPTIONS.find((color) => color.value === tag.color) ??
    COLOR_OPTIONS[0]!;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await axios.delete(`/api/workspace/${workspaceslug}/tags/${tag.id}`);
      toast.success("Tag deleted successfully");
      await mutate(`/api/workspace/${workspaceslug}/tags`);
    } catch {
      toast.error("Failed to delete tag");
    } finally {
      setIsDeleting(false);
      setIsDropdownOpen(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const dropdownItems = [
    {
      icon: Pencil,
      label: "Edit",
      onClick: () => {
        setIsEditDialogOpen(true);
        setIsDropdownOpen(false);
      },
    },
    {
      icon: Trash,
      label: "Delete",
      color: "text-destructive hover:text-destructive",
      onClick: () => {
        setIsDeleteDialogOpen(true);
        setIsDropdownOpen(false);
      },
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between gap-2 rounded-xl border p-3 text-sm transition-shadow hover:shadow-[0_0_10px_0_rgba(0,0,0,0.07)]">
        <div className="left flex items-center gap-2">
          <div
            className={cn(
              "flex w-fit items-center gap-2 rounded-full border p-2",
              colorOption.bgColor,
              colorOption.borderColor,
            )}
          >
            <Tag className={cn("h-4 w-4 p-[1px]", colorOption.textColor)} />
          </div>
          <div>{tag.name}</div>
        </div>
        <div className="right flex items-center gap-2">
          <Badge
            className="flex cursor-pointer items-center justify-center gap-x-1 rounded-sm bg-zinc-100/50 text-xs font-normal text-zinc-700 shadow-none hover:bg-zinc-200/50 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
            variant={"outline"}
          >
            {tag.linkCount} {tag.linkCount === 1 ? "link" : "links"}
          </Badge>

          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-transparent"
                aria-label="Tag options"
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
                {dropdownItems.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 px-3",
                      item.color,
                    )}
                    onClick={item.onClick}
                    disabled={isDeleting}
                  >
                    {item.icon && (
                      <item.icon className={cn("h-3 w-3", item.color)} />
                    )}
                    <span className={cn("text-sm", item.color)}>
                      {item.label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-white sm:max-w-[425px] dark:bg-black">
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the tag &ldquo;{tag.name}&rdquo;?
              This action cannot be undone.
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

      <CreateTagForm
        workspaceslug={workspaceslug}
        initialData={tag}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </>
  );
};

export default TagCard;
