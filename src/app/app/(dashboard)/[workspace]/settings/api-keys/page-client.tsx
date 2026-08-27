"use client";

import { memo, useCallback, useState } from "react";
import useSWR from "swr";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoaderCircle } from "@/utils/icons/loader-circle";

interface ApiKeyRow {
  id: string;
  name: string;
  maskedKey: string;
  leadsPermission: string;
  lastUsed: string | null;
  createdAt: string;
}

interface ApiKeysResponse {
  keys: ApiKeyRow[];
}

interface CreatedKeyResponse {
  key: {
    id: string;
    name: string;
    key: string;
    leadsPermission: string;
    createdAt: string;
  };
  endpoint: string;
}

async function fetchApiKeys(url: string): Promise<ApiKeysResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load API keys");
  return res.json();
}

export default memo(function ApiKeysClient({
  workspaceslug,
}: {
  workspaceslug: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedKeyResponse | null>(null);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyRow | null>(null);
  const [revoking, setRevoking] = useState(false);

  const { data, mutate, isLoading } = useSWR<ApiKeysResponse>(
    `/api/workspace/${workspaceslug}/api-keys`,
    fetchApiKeys,
  );

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/workspace/${workspaceslug}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const payload = (await res.json()) as CreatedKeyResponse & {
        error?: string;
      };
      if (!res.ok) {
        toast.error(payload.error ?? "Failed to create API key");
        return;
      }
      setCreatedKey(payload);
      setName("");
      void mutate();
      toast.success("API key created");
    } catch {
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  }, [name, workspaceslug, mutate]);

  const handleRevoke = useCallback(async () => {
    if (!keyToRevoke) return;
    setRevoking(true);
    try {
      const res = await fetch(
        `/api/workspace/${workspaceslug}/api-keys/${keyToRevoke.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        toast.error("Failed to revoke API key");
        return;
      }
      toast.success("API key revoked");
      setKeyToRevoke(null);
      void mutate();
    } catch {
      toast.error("Failed to revoke API key");
    } finally {
      setRevoking(false);
    }
  }, [keyToRevoke, workspaceslug, mutate]);

  const copyText = useCallback(async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }, []);

  return (
    <div className="py-3">
      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardDescription className="mt-2 max-w-2xl">
              Generate keys to track leads from your app.{" "}
              <a
                href="https://slugy.co/blogs/lead-conversion-tracking"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 hover:no-underline"
              >
                View setup instructions
              </a>
            </CardDescription>
          </div>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setCreatedKey(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Create key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API key</DialogTitle>
                <DialogDescription>
                  Keys can track lead conversions for this workspace.
                </DialogDescription>
              </DialogHeader>
              {createdKey ? (
                <div className="space-y-4">
                  <div className="bg-muted/40 rounded-md border p-3">
                    <p className="text-muted-foreground mb-2 text-xs">
                      Copy this key now — it won&apos;t be shown again.
                    </p>
                    <code className="block text-sm break-all">
                      {createdKey.key.key}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => void copyText(createdKey.key.key, "API key")}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy API key
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="api-key-name">Name</Label>
                  <Input
                    id="api-key-name"
                    placeholder="Production website"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <DialogFooter>
                {createdKey ? (
                  <Button onClick={() => setOpen(false)}>Done</Button>
                ) : (
                  <Button
                    onClick={() => void handleCreate()}
                    disabled={creating || !name.trim()}
                  >
                    {creating ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create"
                    )}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center">
                    <LoaderCircle className="text-muted-foreground mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : data?.keys.length ? (
                data.keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>{key.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {key.maskedKey}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {key.lastUsed
                        ? new Date(key.lastUsed).toLocaleString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Revoke API key"
                        onClick={() => setKeyToRevoke(key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-8 text-center text-sm"
                  >
                    No API keys yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!keyToRevoke}
        onOpenChange={(next) => {
          if (!next && !revoking) setKeyToRevoke(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke{" "}
              {keyToRevoke ? (
                <span className="text-foreground font-medium">
                  &ldquo;{keyToRevoke.name}&rdquo;
                </span>
              ) : (
                "this key"
              )}
              ? Apps using it will stop working. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void handleRevoke()}
              disabled={revoking}
            >
              {revoking ? (
                <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
              ) : null}
              Revoke
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
