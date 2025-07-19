"use client";
import {
  AlertDialog,
  // AlertDialogAction,
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
import { useState } from "react";
import { LoaderCircle } from "@/utils/icons/loader-circle";

export function AlertDialogBox({ workspaceslug }: { workspaceslug: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

  const handleDelete = async () => {
    if (confirmationText !== workspaceslug) {
      toast.error("Please type the workspace slug correctly to confirm deletion.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.delete(
        `/api/workspace/${workspaceslug}/settings`,
      );
      if (response.status === 200) {
        toast.success("Workspace deleted successfully!");
        router.refresh();
        router.push("/");
      }
    } catch (error) {
      console.error("Error deleting workspace:", error);
      toast.error("Failed to delete workspace. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isConfirmationValid = confirmationText === workspaceslug;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Workspace</Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-background sm:max-w-md p-4">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-medium">
            Are you absolutely sure?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            workspace and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirmation" className="font-normal">
              To verify, type <span className="font-mono text-sm bg-muted px-1 py-0.5 rounded font-medium">{workspaceslug}</span> below:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmationText("")}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant={"destructive"}
            onClick={() => handleDelete()}
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
