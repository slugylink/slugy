"use client";
import { useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "@/utils/icons/loader-circle";

const CONFIRMATION_TEXT = "DELETE";

interface AlertDialogBoxProps {
  accountId: string;
}

export function AlertDialogBox({ accountId }: AlertDialogBoxProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const resetState = useCallback(() => {
    setConfirmationText("");
    setIsLoading(false);
  }, []);

  const clearClientState = useCallback(() => {
    try {
      const cookies = document.cookie ? document.cookie.split(";") : [];
      for (const cookie of cookies) {
        const name = cookie.split("=")[0]?.trim();
        if (!name) continue;
        document.cookie = `${name}=; Max-Age=0; Path=/`;
      }
      localStorage.clear();
      sessionStorage.clear();
    } catch (error) {
      console.error(
        "Failed to clear client state after account deletion:",
        error,
      );
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (confirmationText !== CONFIRMATION_TEXT) {
      toast.error(
        `Please type '${CONFIRMATION_TEXT}' correctly to confirm deletion.`,
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.delete(`/api/account/${accountId}`);
      if (response.status === 200) {
        clearClientState();
        router.replace("/login");
        router.refresh();
        return;
      }
      toast.error("Failed to delete account. Please try again.");
      setIsLoading(false);
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account. Please try again.");
      setIsLoading(false);
    }
  }, [confirmationText, accountId, clearClientState, router]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (!open) {
        resetState();
      }
    },
    [resetState],
  );

  const isConfirmationValid = confirmationText === CONFIRMATION_TEXT;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          Delete Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-background p-4 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-medium">
            Are you absolutely sure?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirmation" className="font-normal">
            To verify, type{" "}
            <span className="bg-muted rounded px-1 py-0.5 font-mono text-sm font-medium">
              {CONFIRMATION_TEXT}
            </span>{" "}
            below:
          </Label>
          <Input
            id="confirmation"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            autoComplete="off"
            disabled={isLoading}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || !isConfirmationValid}
          >
            {isLoading && (
              <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
            )}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
