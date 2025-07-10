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
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "@/utils/icons/loader-circle";

export function AlertDialogBox({ workspaceslug }: { workspaceslug: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await axios.delete(`/api/workspace/${workspaceslug}/settings`);
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

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Workspace</Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-background max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-medium">Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            workspace and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant={"destructive"}
            onClick={() => handleDelete()}
            disabled={isLoading}
          >
            {isLoading && (
              <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
            )}
            Continue
          </Button>
          {/* <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
            
          </AlertDialogAction> */}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
