"use client";

import { memo, useCallback, useState } from "react";
import useSWR from "swr";
import { Copy, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { brandFor } from "@/lib/integrations/branding";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { LoaderCircle } from "@/utils/icons/loader-circle";

interface CatalogEntry {
  provider: string;
  name: string;
  category: string;
  description: string;
  connectType: string;
  status: string;
}

interface WebhookRow {
  id: string;
  url: string;
  secretHint: string | null;
  events: string[];
  active: boolean;
  createdAt: string;
}

interface IntegrationsResponse {
  integrations: CatalogEntry[];
  webhookCount: number;
  managersOnly: boolean;
  viewerRole: "owner" | "admin" | "member";
}

interface WebhooksResponse {
  endpoints: WebhookRow[];
}

interface CreatedWebhookResponse {
  endpoint: WebhookRow & { secret: string };
}

const EVENT_OPTIONS = ["lead.created", "sale.created"];

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
}

export default memo(function IntegrationsClient({
  workspaceslug,
}: {
  workspaceslug: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([
    "lead.created",
    "sale.created",
  ]);
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [hookToDelete, setHookToDelete] = useState<WebhookRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const { data, mutate, isLoading } = useSWR<IntegrationsResponse>(
    `/api/workspace/${workspaceslug}/integrations`,
    fetcher,
  );
  const {
    data: hooks,
    mutate: mutateHooks,
    isLoading: hooksLoading,
  } = useSWR<WebhooksResponse>(
    `/api/workspace/${workspaceslug}/webhooks`,
    fetcher,
  );

  const toggleEvent = useCallback((e: string) => {
    setEvents((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );
  }, []);

  const handleCreate = useCallback(async () => {
    if (!url.trim() || events.length === 0 || creating) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/workspace/${workspaceslug}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), events }),
      });
      const payload = (await res.json()) as CreatedWebhookResponse & {
        error?: string;
      };
      if (!res.ok) {
        toast.error(payload.error ?? "Failed to create webhook");
        return;
      }
      setCreatedSecret(payload.endpoint.secret);
      setUrl("");
      void mutateHooks();
      toast.success("Webhook created");
    } catch {
      toast.error("Failed to create webhook");
    } finally {
      setCreating(false);
    }
  }, [url, events, creating, workspaceslug, mutateHooks]);

  const handleDelete = useCallback(async () => {
    if (!hookToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/workspace/${workspaceslug}/webhooks/${hookToDelete.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        toast.error("Failed to delete webhook");
        return;
      }
      toast.success("Webhook deleted");
      setHookToDelete(null);
      void mutateHooks();
    } catch {
      toast.error("Failed to delete webhook");
    } finally {
      setDeleting(false);
    }
  }, [hookToDelete, workspaceslug, mutateHooks]);

  const handleToggle = useCallback(
    async (hook: WebhookRow, next: boolean) => {
      setTogglingId(hook.id);
      try {
        const res = await fetch(
          `/api/workspace/${workspaceslug}/webhooks/${hook.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: next }),
          },
        );
        if (!res.ok) {
          toast.error("Failed to update webhook");
          return;
        }
        toast.success(next ? "Webhook resumed" : "Webhook paused");
        void mutateHooks();
      } catch {
        toast.error("Failed to update webhook");
      } finally {
        setTogglingId(null);
      }
    },
    [workspaceslug, mutateHooks],
  );

  const connectSlack = useCallback(() => {
    window.location.href = `/api/integrations/slack/install?workspace=${encodeURIComponent(workspaceslug)}`;
  }, [workspaceslug]);

  const sendSlackTest = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/workspace/${workspaceslug}/integrations/slack/test`,
        { method: "POST" },
      );
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(payload.error ?? "Test notification failed");
        return;
      }
      toast.success("Test notification sent — check Slack");
    } catch {
      toast.error("Test notification failed");
    }
  }, [workspaceslug]);

  const disconnect = useCallback(
    async (provider: string) => {
      const res = await fetch(
        `/api/workspace/${workspaceslug}/integrations/${provider}`,
        { method: "DELETE" },
      );
      if (!res.ok) toast.error("Disconnect failed");
      else {
        toast.success("Disconnected");
        void mutate();
      }
    },
    [workspaceslug, mutate],
  );

  const copyText = useCallback(async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }, []);

  const managersOnly = data?.managersOnly ?? false;
  const viewerRole = data?.viewerRole ?? "member";
  const canManagePolicy = viewerRole === "owner";
  const readOnly = managersOnly && viewerRole === "member";

  const handlePolicyToggle = useCallback(
    async (next: boolean) => {
      setSavingPolicy(true);
      try {
        const res = await fetch(
          `/api/workspace/${workspaceslug}/integrations/settings`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ managersOnly: next }),
          },
        );
        const payload = (await res.json()) as { error?: string };
        if (!res.ok) {
          toast.error(payload.error ?? "Failed to update setting");
          return;
        }
        toast.success(
          next
            ? "Only owners and admins can manage integrations"
            : "All members can manage integrations",
        );
        void mutate();
      } catch {
        toast.error("Failed to update setting");
      } finally {
        setSavingPolicy(false);
      }
    },
    [workspaceslug, mutate],
  );

  return (
    <div className="space-y-6 py-3">
      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardDescription className="mt-2 max-w-2xl">
              Connect Slack, Zapier, Make, Polar, Shopify, and WordPress to
              extend your workspace. Automation apps consume the outbound
              webhooks below.
            </CardDescription>
          </div>
          {canManagePolicy && (
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs">
              <Switch
                aria-label="Restrict integrations to owners and admins"
                checked={managersOnly}
                disabled={isLoading || savingPolicy}
                onCheckedChange={(next) => void handlePolicyToggle(next)}
              />
              <span className="text-muted-foreground">
                Owners + admins only
              </span>
            </label>
          )}
        </CardHeader>
        {readOnly && (
          <CardContent className="pt-0">
            <p className="bg-muted/40 text-muted-foreground rounded-md border p-3 text-xs">
              Only owners and admins can change integrations in this workspace.
            </p>
          </CardContent>
        )}
        <CardContent className={readOnly ? "pt-0" : undefined}>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data?.integrations.map((item) => {
                const brand = brandFor(item.provider);
                const connected = item.status === "connected";
                return (
                  <div
                    key={item.provider}
                    className="flex flex-col rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="bg-muted flex h-9 w-9 items-center justify-center rounded-md">
                        {brand.src ? (
                          <Image
                            src={brand.src}
                            alt=""
                            width={16}
                            height={16}
                            className={
                              brand.invertOnDark ? "dark:invert" : undefined
                            }
                          />
                        ) : (
                          brand.Icon && (
                            <brand.Icon className="h-4 w-4" aria-hidden />
                          )
                        )}
                      </div>
                      <Badge variant={connected ? "default" : "secondary"}>
                        {connected ? "Connected" : item.category}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm font-medium">{item.name}</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {item.description}
                    </p>
                    <div className="mt-3 pt-1">
                      {item.provider === "slack" ? (
                        connected ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void disconnect("slack")}
                            >
                              Disconnect
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void sendSlackTest()}
                            >
                              Send test
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={connectSlack}>
                            Connect
                          </Button>
                        )
                      ) : (
                        <p className="text-muted-foreground text-xs">
                          {item.provider === "zapier" ||
                          item.provider === "make" ||
                          item.provider === "segment"
                            ? "Add a webhook below to use as the trigger."
                            : "Uses an API key plus the webhooks below."}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardDescription className="mt-2 max-w-2xl">
              Fan out <code>lead.created</code> and <code>sale.created</code> to
              Zapier, Make, or your own server. Deliveries are signed with{" "}
              <code>slugy-signature</code> (HMAC-SHA256).
            </CardDescription>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(next) => {
              setDialogOpen(next);
              if (!next) {
                setCreatedSecret(null);
                setUrl("");
                setEvents(["lead.created", "sale.created"]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="mr-1 h-4 w-4" />
                Add webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add webhook</DialogTitle>
                <DialogDescription>
                  Events are POSTed as JSON the moment they happen. The signing
                  secret is shown once.
                </DialogDescription>
              </DialogHeader>
              {createdSecret ? (
                <div className="space-y-4">
                  <div className="bg-muted/40 rounded-md border p-3">
                    <p className="text-muted-foreground mb-2 text-xs">
                      Copy this secret now — it won&apos;t be shown again.
                      Verify the <code>slugy-signature</code> header with it.
                    </p>
                    <code className="block text-sm break-all">
                      {createdSecret}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => void copyText(createdSecret, "Secret")}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy secret
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="wh-url">Destination URL</Label>
                    <Input
                      id="wh-url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://hooks.zapier.com/hooks/catch/…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Events</Label>
                    <div className="flex flex-col gap-2">
                      {EVENT_OPTIONS.map((e) => (
                        <label
                          key={e}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={events.includes(e)}
                            onCheckedChange={() => toggleEvent(e)}
                          />
                          <code className="text-xs">{e}</code>
                        </label>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => void handleCreate()}
                      disabled={creating || !url.trim() || events.length === 0}
                    >
                      {creating ? (
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Add webhook
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destination</TableHead>
                <TableHead className="hidden md:table-cell">Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {hooksLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center">
                    <LoaderCircle className="text-muted-foreground mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : hooks?.endpoints.length ? (
                hooks.endpoints.map((hook) => (
                  <TableRow key={hook.id}>
                    <TableCell>
                      <p className="max-w-[160px] truncate font-mono text-xs sm:max-w-[320px]">
                        {hook.url}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {hook.secretHint ?? "no secret"}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                      {hook.events.join(", ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={hook.active ? "default" : "secondary"}>
                        {hook.active ? "Active" : "Paused"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Switch
                          aria-label={hook.active ? "Pause" : "Resume"}
                          checked={hook.active}
                          disabled={togglingId === hook.id}
                          onCheckedChange={(next) =>
                            void handleToggle(hook, next)
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete webhook"
                          onClick={() => setHookToDelete(hook)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-8 text-center text-sm"
                  >
                    No webhooks yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!hookToDelete}
        onOpenChange={(next) => {
          if (!next && !deleting) setHookToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete webhook</AlertDialogTitle>
            <AlertDialogDescription>
              {hookToDelete ? (
                <>
                  Stop sending events to{" "}
                  <span className="text-foreground font-mono text-xs break-all">
                    {hookToDelete.url}
                  </span>
                  ? Automations using it will stop receiving events.
                </>
              ) : (
                "This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? (
                <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
