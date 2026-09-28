"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { LoaderCircle } from "@/utils/icons/loader-circle";

interface CustomDomain {
  id: string;
  domain: string;
}

interface DeleteDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: CustomDomain;
  workspaceslug: string;
  onDeleted: (domainId: string) => void;
}

export function DeleteDomainDialog({
  open,
  onOpenChange,
  domain,
  workspaceslug,
  onDeleted,
}: DeleteDomainDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await axios.delete(
        `/api/workspace/${workspaceslug}/domains?domainId=${domain.id}`,
      );

      toast.success("Domain deleted successfully");
      onDeleted(domain.id);
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error deleting domain:", error);
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const data = error.response.data as
          | { error?: string; linkCount?: number }
          | undefined;
        toast.error(
          data?.error || "Move or delete this domain's short links first.",
          { duration: 8000 },
        );
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete domain";
        toast.error(errorMessage);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Custom Domain</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="text-foreground font-medium">{domain.domain}</span>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 my-4 rounded-lg p-3">
          <p className="text-muted-foreground text-sm">
            Domains with active short links cannot be deleted — move or delete
            those links first. The domain will also be detached from Vercel.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <LoaderCircle className="animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
