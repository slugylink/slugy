"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DiamondPlus, EllipsisVertical, Pencil, Trash } from "lucide-react";
import React, { useState } from "react";
import { format } from "date-fns";
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
import {
  UTM_FIELDS,
  UTM_TEMPLATE_FIELD_MAP,
  type UtmTemplate,
} from "@/constants/utm-fields";
import UtmTemplateForm from "@/components/web/_utm-templates/create-utm-template-dialog";

interface UtmTemplateCardProps {
  template: UtmTemplate;
  workspaceslug: string;
}

const UtmTemplateCard = ({ template, workspaceslug }: UtmTemplateCardProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const activeFields = UTM_FIELDS.filter(
    ({ key }) => template[UTM_TEMPLATE_FIELD_MAP[key]] != null,
  );

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await axios.delete(
        `/api/workspace/${workspaceslug}/utm-templates/${template.id}`,
      );
      toast.success("Template deleted successfully");
      await mutate(`/api/workspace/${workspaceslug}/utm-templates`);
    } catch {
      toast.error("Failed to delete template");
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
          <div className="flex w-fit items-center gap-2 rounded-full border p-2">
            <DiamondPlus className="h-4 w-4 p-[1px]" />
          </div>
          <div className="font-medium">{template.name}</div>
        </div>
        <div className="right flex items-center gap-3">
          <div className="text-muted-foreground hidden items-center gap-2 sm:flex">
            {activeFields.map(({ key, label, icon: Icon }) => (
              <span key={key} title={label}>
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>

          <span className="text-muted-foreground hidden text-xs sm:inline">
            {format(new Date(template.createdAt), "MMM d, yyyy")}
          </span>

          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-transparent"
                aria-label="Template options"
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
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the template &ldquo;
              {template.name}&rdquo;? This action cannot be undone.
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

      <UtmTemplateForm
        workspaceslug={workspaceslug}
        initialData={template}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </>
  );
};

export default UtmTemplateCard;
