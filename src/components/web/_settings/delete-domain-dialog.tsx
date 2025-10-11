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
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

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
        `/api/workspace/${workspaceslug}/domains?domainId=${domain.id}`
      );

      toast.success("Domain deleted successfully");
      onDeleted(domain.id);
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error deleting domain:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete domain";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="bg-destructive/10 mb-2 flex size-12 items-center justify-center rounded-full">
            <AlertTriangle className="text-destructive size-6" />
          </div>
          <DialogTitle>Delete Custom Domain</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{domain.domain}</span>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 my-4 rounded-lg p-4">
          <p className="text-muted-foreground text-sm">
            Any short links using this domain will stop working. Make sure to update
            or remove them before deleting this domain.
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
            {isDeleting && <Loader2 className="animate-spin" />}
            Delete Domain
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

