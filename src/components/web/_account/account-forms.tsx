"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner"; // Assuming you're using sonner for toasts
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check } from "lucide-react";
import { AlertDialogBox } from "./alert-box";
import { LoaderCircle } from "@/utils/icons/loader-circle";

// Validation Schema
const UserAccountSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(32, "Name must be 32 characters or less"),
  defaultWorkspaceId: z.string().optional(),
});

interface UserAccountProps {
  account: {
    name: string | null;
    email: string;
    id: string;
    ownedWorkspaces: { id: string; slug: string; name: string; isDefault?: boolean }[];
  };
}

export default function UserAccountForms({ account }: UserAccountProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isNameSubmitting, setIsNameSubmitting] = useState(false);
  const [isWorkspaceSubmitting, setIsWorkspaceSubmitting] = useState(false);

  // Separate form for name
  const nameForm = useForm<z.infer<typeof UserAccountSchema>>({
    resolver: zodResolver(UserAccountSchema),
    defaultValues: {
      name: account.name ?? "",
      defaultWorkspaceId:
        account.ownedWorkspaces.find((ws) => ws.isDefault)?.id ?? "",
    },
  });

  // Separate form for workspace
  const workspaceForm = useForm<z.infer<typeof UserAccountSchema>>({
    resolver: zodResolver(UserAccountSchema),
    defaultValues: {
      name: account.name ?? "",
      defaultWorkspaceId:
        account.ownedWorkspaces.find((ws) => ws.isDefault)?.id ?? "",
    },
  });

  // Copy User ID to Clipboard
  const handleCopyId = () => {
    void navigator.clipboard.writeText(account.id).then(() => {
      setIsCopied(true);
      toast.success("User ID copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Submit Handler for Name
  const onSubmitName = async (data: z.infer<typeof UserAccountSchema>) => {
    setIsNameSubmitting(true);
    try {
      const response = await fetch(`/api/account/${account.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          defaultWorkspaceId: data.defaultWorkspaceId, // Include the defaultWorkspaceId field as well
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error: string };
        throw new Error(errorData.error || "Update failed");
      }

      toast.success("Name updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsNameSubmitting(false);
    }
  };

  // Submit Handler for Workspace
  const onSubmitWorkspace = async (data: z.infer<typeof UserAccountSchema>) => {
    setIsWorkspaceSubmitting(true);
    try {
      const response = await fetch(`/api/account/${account.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name, // Include the name field as well
          defaultWorkspaceId: data.defaultWorkspaceId,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error: string };
        throw new Error(errorData.error || "Update failed");
      }

      toast.success("Default workspace updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsWorkspaceSubmitting(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center">
      <div className="w-full space-y-6 py-6">
        {/* Name Card */}
        <form onSubmit={nameForm.handleSubmit(onSubmitName)}>
          <Card className="bg-background border">
            <CardHeader>
              <CardTitle>Your Name</CardTitle>
              <CardDescription>This will be your display name.</CardDescription>
            </CardHeader>
            <CardContent className="bg-background">
              <div className="space-y-2">
                <Controller
                  name="name"
                  control={nameForm.control}
                  render={({ field }) => (
                    <Input {...field} placeholder="Your name" />
                  )}
                />
                {nameForm.formState.errors.name && (
                  <p className="text-destructive text-sm">
                    {nameForm.formState.errors.name.message}
                  </p>
                )}
                <p className="text-muted-foreground text-sm">
                  Max 32 characters.
                </p>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                type="submit"
                variant="outline"
                disabled={isNameSubmitting || !nameForm.formState.isDirty}
              >
                {isNameSubmitting && (
                  <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
                )}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </form>

        {/* Default Workspace */}
        <form onSubmit={workspaceForm.handleSubmit(onSubmitWorkspace)} className="mt-6">
          <Card className="bg-background border">
            <CardHeader>
              <CardTitle>Your Default Workspace</CardTitle>
              <CardDescription>
                Choose the workspace to show by default when you sign in.
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-background">
              <Controller
                name="defaultWorkspaceId"
                control={workspaceForm.control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {account.ownedWorkspaces.map((workspace) => (
                        <SelectItem key={workspace.id} value={workspace.id}>
                          {workspace.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                type="submit"
                variant="outline"
                disabled={isWorkspaceSubmitting || !workspaceForm.formState.isDirty}
              >
                {isWorkspaceSubmitting && (
                  <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
                )}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </form>

        {/* Email Card */}
        <Card className="bg-background border">
          <CardHeader>
            <CardTitle>Your Email</CardTitle>
            <CardDescription>
              This will be the email you use to log in and receive
              notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-background">
            <Input
              value={account.email}
              className="cursor-not-allowed bg-zinc-50"
              readOnly
            />
          </CardContent>
        </Card>

        {/* ID Card */}
        <Card className="bg-background border">
          <CardHeader>
            <CardTitle>Your User ID</CardTitle>
            <CardDescription>
              This is your unique account identifier.
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-background">
            <div className="flex gap-2">
              <Input
                value={account.id}
                className="cursor-not-allowed bg-zinc-50"
                readOnly
              />
              <Button
                variant="outline"
                size="icon"
                className="size-9 p-1"
                onClick={handleCopyId}
              >
                {isCopied ? (
                  <Check className="h-3 w-3 p-[1px] text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 p-[1px]" />
                )}
                <span className="sr-only">Copy ID</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-destructive border">
          <CardHeader>
            <CardTitle className="text-destructive">Delete Account</CardTitle>
            <CardDescription>
              Permanently delete your account, all of your workspaces, links,
              and their respective stats. This action cannot be undone - please
              proceed with caution.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <AlertDialogBox accountId={account.id} />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
