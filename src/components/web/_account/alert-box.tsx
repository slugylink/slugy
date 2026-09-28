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
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { useSubscriptionStore } from "@/store/subscription";
import { checkUserExists } from "@/lib/auth-client";
import { createAuthClient } from "better-auth/react";

const { useSession } = createAuthClient();

const CONFIRMATION_TEXT = "DELETE";

interface AlertDialogBoxProps {
  accountId: string;
}

export function AlertDialogBox({ accountId }: AlertDialogBoxProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  const resetState = useCallback(() => {
    setConfirmationText("");
    setCurrentPassword("");
    setIsLoading(false);
  }, []);

  const clearClientState = useCallback(() => {
    try {
      useSubscriptionStore.getState().resetSubscription();
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

    if (requiresPassword && !currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.delete(`/api/account/${accountId}`, {
        data: {
          confirmation: CONFIRMATION_TEXT,
          ...(requiresPassword ? { currentPassword } : {}),
        },
      });
      if (response.status === 200) {
        clearClientState();
        // Hard navigation so Set-Cookie clears from the delete response apply
        // before the next document load (router.replace can race middleware).
        window.location.assign("/login");
        return;
      }
      toast.error("Failed to delete account. Please try again.");
      setIsLoading(false);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data as
          | {
              error?: string;
              details?: { workspaces?: Array<{ slug: string }> };
            }
          | undefined;
        if (status === 401) {
          toast.error(data?.error || "Current password is incorrect.");
          setIsLoading(false);
          return;
        }
        if (status === 409) {
          const slugs =
            data?.details?.workspaces
              ?.map((w) => w.slug)
              .filter(Boolean)
              .join(", ") || "shared workspaces";
          toast.error(`Transfer ownership or remove members first: ${slugs}.`, {
            duration: 8000,
          });
          setIsLoading(false);
          return;
        }
        if (status === 429) {
          toast.error("Too many attempts. Please try again later.");
          setIsLoading(false);
          return;
        }
        if (status === 502) {
          toast.error(
            data?.error ||
              "Billing cancellation failed — your account was NOT deleted.",
            { duration: 8000 },
          );
          setIsLoading(false);
          return;
        }
      }
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account. Please try again.");
      setIsLoading(false);
    }
  }, [
    confirmationText,
    requiresPassword,
    currentPassword,
    accountId,
    clearClientState,
  ]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (!open) {
        resetState();
      } else {
        // Password accounts must re-authenticate (stolen-session protection).
        // OAuth-only accounts rely on the session + DELETE confirmation.
        const email = session?.user?.email;
        if (email) {
          checkUserExists(email)
            .then((data) => {
              setRequiresPassword(data?.provider === "credential");
            })
            .catch(() => {
              // Fail closed-ish: unknown provider → ask for password only if
              // the user can provide one; server enforces the real rule.
              setRequiresPassword(false);
            });
        }
      }
    },
    [resetState, session?.user?.email],
  );

  const isConfirmationValid =
    confirmationText === CONFIRMATION_TEXT &&
    (!requiresPassword || currentPassword.length > 0);

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

        {requiresPassword && (
          <div className="space-y-2">
            <Label htmlFor="current-password" className="font-normal">
              Confirm with your current password:
            </Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>
        )}

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
