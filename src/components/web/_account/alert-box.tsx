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
import { authClient } from "@/lib/auth-client";
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
        await authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              router.refresh();
              router.push("/login");
            },
          },
        });
      } else {
        await authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              router.refresh();
              router.push("/login");
            },
          },
        });
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account. Please try again.");
      setIsLoading(false);
    }
  }, [confirmationText, accountId, router]);

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
        <Button variant="destructive">Delete Account</Button>
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
