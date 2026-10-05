"use client";

import { memo, useCallback, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const EVENT_OPTIONS = ["lead.created", "sale.created", "link.clicked"];

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("load failed");
  return res.json();
}

export default memo(function IntegrationsClient({
  workspaceslug,
}: {
  workspaceslug: string;
}) {
  const { data, mutate, isLoading } = useSWR<{
    integrations: CatalogEntry[];
    webhookCount: number;
  }>(`/api/workspace/${workspaceslug}/integrations`, fetcher);
  const { data: hooks, mutate: mutateHooks } = useSWR<{
    endpoints: WebhookRow[];
  }>(`/api/workspace/${workspaceslug}/webhooks`, fetcher);

  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([
    "lead.created",
    "sale.created",
  ]);
  const [creating, setCreating] = useState(false);
  const [lastSecret, setLastSecret] = useState<string | null>(null);

  const toggleEvent = useCallback((e: string) => {
    setEvents((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );
  }, []);

  const createWebhook = useCallback(async () => {
    if (!url.trim() || events.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/workspace/${workspaceslug}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), events }),
      });
      const payload = await res.json();
      if (!res.ok) {
        toast.error(payload.error ?? "Failed to create webhook");
        return;
      }
      setLastSecret(payload.endpoint.secret as string);
      setUrl("");
      void mutateHooks();
      toast.success("Webhook created — copy the secret now");
    } catch {
      toast.error("Failed to create webhook");
    } finally {
      setCreating(false);
    }
  }, [url, events, workspaceslug, mutateHooks]);

  const deleteWebhook = useCallback(
    async (id: string) => {
      const res = await fetch(
        `/api/workspace/${workspaceslug}/webhooks/${id}`,
        { method: "DELETE" },
      );
      if (!res.ok) toast.error("Delete failed");
      else {
        toast.success("Webhook deleted");
        void mutateHooks();
      }
    },
    [workspaceslug, mutateHooks],
  );

  const connectSlack = useCallback(() => {
    window.location.href = `/api/integrations/slack/install?workspace=${encodeURIComponent(workspaceslug)}`;
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          data?.integrations.map((i) => (
            <Card key={i.provider} className="shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{i.name}</CardTitle>
                  <Badge
                    variant={i.status === "connected" ? "default" : "secondary"}
                  >
                    {i.status === "connected" ? "Connected" : i.category}
                  </Badge>
                </div>
                <CardDescription>{i.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {i.provider === "slack" ? (
                  i.status === "connected" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void disconnect("slack")}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button size="sm" onClick={connectSlack}>
                      Connect Slack
                    </Button>
                  )
                ) : i.provider === "zapier" ||
                  i.provider === "make" ||
                  i.provider === "segment" ? (
                  <p className="text-muted-foreground text-xs">
                    Use a webhook below as the Zapier / Make trigger (
                    {i.connectType}).
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    API-key / checkout-metadata guide — see webhook + API keys.
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Outbound webhooks</CardTitle>
          <CardDescription>
            Fan out <code>lead.created</code> / <code>sale.created</code> to
            Zapier, Make, or your server. Signed with{" "}
            <code>slugy-signature</code> (HMAC-SHA256).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="wh-url">Destination URL</Label>
              <Input
                id="wh-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/…"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {EVENT_OPTIONS.map((e) => (
                  <label key={e} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={events.includes(e)}
                      onChange={() => toggleEvent(e)}
                    />
                    <code>{e}</code>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                onClick={() => void createWebhook()}
                disabled={creating || !url.trim()}
              >
                {creating ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  "Add webhook"
                )}
              </Button>
            </div>
          </div>

          {lastSecret ? (
            <p className="rounded-md border p-3 font-mono text-xs break-all">
              Secret (copy now, shown once): {lastSecret}
            </p>
          ) : null}

          <div className="space-y-2">
            {hooks?.endpoints.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">{h.url}</p>
                  <p className="text-muted-foreground text-xs">
                    {h.events.join(", ")} · {h.active ? "active" : "paused"} ·{" "}
                    {h.secretHint ?? "no secret"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void deleteWebhook(h.id)}
                >
                  Delete
                </Button>
              </div>
            )) ?? null}
            {!hooks?.endpoints.length ? (
              <p className="text-muted-foreground text-xs">
                No webhooks yet — add your first Zapier catch-hook above.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
