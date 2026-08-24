"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Check,
  Copy,
  KeyRound,
  Plus,
  Trash2,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ApiKeyRow {
  id: string;
  name: string;
  key: string;
  permissionLevel: string;
  conversionsPermission: string;
  lastUsed: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface ApiKeysClientProps {
  workspaceslug: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Failed to load API keys");
  }
  return data as { keys: ApiKeyRow[] };
};

function CopyableBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={onCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          Copy
        </Button>
      </div>
      <pre className="bg-muted/60 overflow-x-auto rounded-md border p-3 text-xs leading-relaxed break-all whitespace-pre-wrap">
        {value}
      </pre>
    </div>
  );
}

export default function ApiKeysClient({ workspaceslug }: ApiKeysClientProps) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/workspace/${workspaceslug}/api-keys`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const apiBase = useMemo(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return "https://app.slugy.co";
  }, []);

  const trackEndpoint = `${apiBase}/api/track/lead`;

  const curlSnippet = `curl -X POST ${trackEndpoint} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clickId": "FROM_slugy_id_QUERY_PARAM",
    "eventName": "Sign up",
    "externalId": "user_123",
    "customerEmail": "ada@example.com",
    "customerName": "Ada"
  }'`;

  const fetchSnippet = `await fetch("${trackEndpoint}", {
  method: "POST",
  headers: {
    Authorization: "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    clickId: new URLSearchParams(window.location.search).get("slugy_id"),
    eventName: "Sign up",
    externalId: user.id, // recommended — stores Customer
    customerEmail: user.email,
    customerName: user.name,
  }),
});`;

  const resetCreate = () => {
    setName("");
    setRevealedKey(null);
    setCreating(false);
  };

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`/api/workspace/${workspaceslug}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          conversionsPermission: "write",
          permissionLevel: "restricted",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || "Failed to create API key");
      }
      setRevealedKey(body.key as string);
      toast.success("API key created");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }, [name, workspaceslug, mutate]);

  const handleRevoke = useCallback(
    async (keyId: string) => {
      setRevokingId(keyId);
      try {
        const res = await fetch(
          `/api/workspace/${workspaceslug}/api-keys/${keyId}`,
          { method: "DELETE" },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.message || "Failed to revoke key");
        }
        toast.success("API key revoked");
        await mutate();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to revoke");
      } finally {
        setRevokingId(null);
      }
    },
    [workspaceslug, mutate],
  );

  const keys = data?.keys ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground max-w-xl text-sm">
            Create keys to track conversion leads from your app after someone
            clicks a Sluggy short link.
          </p>
        </div>

        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) resetCreate();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create API key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {revealedKey ? "Save your API key" : "Create API key"}
              </DialogTitle>
              <DialogDescription>
                {revealedKey
                  ? "Copy this key now. You will not be able to see it again."
                  : "Keys can call POST /api/track/lead to record conversion leads."}
              </DialogDescription>
            </DialogHeader>

            {revealedKey ? (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Store this securely</AlertTitle>
                  <AlertDescription>
                    This is the only time the full key is shown.
                  </AlertDescription>
                </Alert>
                <CopyableBlock label="API key" value={revealedKey} />
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setCreateOpen(false);
                      resetCreate();
                    }}
                  >
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key-name">Name</Label>
                  <Input
                    id="api-key-name"
                    placeholder="Production, Staging…"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleCreate();
                    }}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Permission: conversions{" "}
                  <Badge variant="secondary">write</Badge>
                </p>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => void handleCreate()}
                    disabled={creating}
                  >
                    {creating && (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            Your keys
          </CardTitle>
          <CardDescription>
            Owner and admin only. Revoked keys stop working immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center gap-2 text-sm">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading keys…
            </div>
          ) : error ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
              {error.message}
            </div>
          ) : keys.length === 0 ? (
            <div className="text-muted-foreground flex h-32 flex-col items-center justify-center gap-2 text-center text-sm">
              <p>No API keys yet.</p>
              <p className="text-xs">Create one to start tracking leads.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Created
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Last used
                  </TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell>
                      <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                        {k.key}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                      {formatDistanceToNow(new Date(k.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                      {k.lastUsed
                        ? formatDistanceToNow(new Date(k.lastUsed), {
                            addSuffix: true,
                          })
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive h-8 w-8"
                            disabled={revokingId === k.id}
                            aria-label={`Revoke ${k.name}`}
                          >
                            {revokingId === k.id ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              “{k.name}” will stop working immediately. This
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => void handleRevoke(k.id)}
                            >
                              Revoke
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Track leads (public API)
          </CardTitle>
          <CardDescription>
            When someone clicks your short link, the destination gets{" "}
            <code className="bg-muted rounded px-1 text-xs">?slugy_id=…</code>.
            Send that value as{" "}
            <code className="bg-muted rounded px-1 text-xs">clickId</code> when
            they convert (signup, form submit, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground text-xs font-medium uppercase">
                Endpoint
              </p>
              <p className="mt-1 font-mono text-xs break-all">
                {trackEndpoint}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground text-xs font-medium uppercase">
                Auth
              </p>
              <p className="mt-1 font-mono text-xs">
                Authorization: Bearer slugy_sk_…
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium">Body fields</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-xs sm:text-sm">
              <li>
                <code className="text-foreground">clickId</code> (required) —
                from <code className="text-foreground">slugy_id</code> query
                param
              </li>
              <li>
                <code className="text-foreground">eventName</code> (optional) —
                defaults to “Lead”
              </li>
              <li>
                <code className="text-foreground">externalId</code>{" "}
                (recommended) — your user id; upserts Customer and links future
                events
              </li>
              <li>
                <code className="text-foreground">customerEmail</code> /{" "}
                <code className="text-foreground">customerName</code> (optional)
              </li>
              <li>
                <code className="text-foreground">metadata</code> (optional) —
                JSON object
              </li>
            </ul>
          </div>

          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="fetch">JavaScript</TabsTrigger>
            </TabsList>
            <TabsContent value="curl" className="mt-3">
              <CopyableBlock label="Example request" value={curlSnippet} />
            </TabsContent>
            <TabsContent value="fetch" className="mt-3">
              <CopyableBlock label="Example request" value={fetchSnippet} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
