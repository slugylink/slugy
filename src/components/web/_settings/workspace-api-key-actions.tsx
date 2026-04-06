"use client";

import { useState } from "react";
import axios from "axios";
import { Copy, Plus } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoaderCircle } from "@/utils/icons/loader-circle";

interface WorkspaceApiKeyItem {
  id: string;
  name: string;
  keyPreview: string;
  createdAt: string;
  lastUsed: string | null;
  expiresAt: string | null;
  permissionLevel: string;
  linksPermission: string;
}

export default function WorkspaceApiKeyActions({
  workspaceslug,
}: {
  workspaceslug: string;
}) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [createdKeyName, setCreatedKeyName] = useState<string | null>(null);

  const resetDialog = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setNewKeyName("");
      setCreatedSecret(null);
      setCreatedKeyName(null);
    }
  };

  const handleCopy = async () => {
    if (!createdSecret) return;

    try {
      await navigator.clipboard.writeText(createdSecret);
      toast.success("API key copied to clipboard");
    } catch {
      toast.error("Failed to copy API key");
    }
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error("API key name is required");
      return;
    }

    setIsCreating(true);

    try {
      const response = await axios.post(
        `/api/workspace/${workspaceslug}/settings/api-keys`,
        { name: newKeyName.trim() },
      );

      const { apiKey, secret } = response.data.data as {
        apiKey: WorkspaceApiKeyItem;
        secret: string;
      };

      setCreatedSecret(secret);
      setCreatedKeyName(apiKey.name);
      setNewKeyName("");
      toast.success("API key created");
      await mutate(`/api/workspace/${workspaceslug}/settings/api-keys`);
    } catch (error) {
      console.error("Failed to create API key:", error);
      toast.error("Failed to create API key");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center justify-end">
      <Dialog open={open} onOpenChange={resetDialog}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            Create API Key
          </Button>
        </DialogTrigger>
        <DialogContent>
          {!createdSecret ? (
            <>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  This key will have link write access so external apps can send
                  conversion events.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="api-key-name">Name</Label>
                <Input
                  id="api-key-name"
                  placeholder="Production conversions"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  disabled={isCreating}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => resetDialog(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating && (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  )}
                  Create
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Copy Your API Key</DialogTitle>
                <DialogDescription>
                  This secret is shown only once. Copy it now and store it
                  safely.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label>{createdKeyName}</Label>
                <div className="flex gap-2">
                  <Input value={createdSecret} readOnly className="font-mono" />
                  <Button type="button" variant="outline" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={() => resetDialog(false)}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
