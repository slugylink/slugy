import { createHmac } from "crypto";
import { db } from "@/server/db";
import { decryptSecret } from "@/lib/integrations/encrypt";
import { postSlackMessage } from "@/lib/integrations/slack";

const DELIVERY_TIMEOUT_MS = 10_000;

async function postJson(
  url: string,
  body: string,
  headers: Record<string, string>,
): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DELIVERY_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } finally {
    clearTimeout(timer);
  }
}

function sign(secret: string, timestamp: string, body: string): string {
  return `v1=${createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex")}`;
}

/**
 * Durable delivery for one fan-out event: signed generic webhooks + Slack.
 * Called from Inngest (retries: 8) or inline in dev. Secrets are never logged.
 */
export async function deliverWebhookEvent(input: {
  workspaceId: string;
  event: string;
  payload: Record<string, unknown>;
}): Promise<{ webhooks: number; slack: boolean }> {
  const { workspaceId, event, payload } = input;
  const body = JSON.stringify({
    event,
    workspaceId,
    createdAt: new Date().toISOString(),
    data: payload,
  });

  const endpoints = await db.webhookEndpoint.findMany({
    where: { workspaceId, active: true, events: { has: event } },
    select: { id: true, url: true, secretEnc: true },
  });

  let delivered = 0;
  for (const endpoint of endpoints) {
    const record = await db.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        event,
        payload: JSON.parse(body) as object,
        status: "pending",
        attempts: 0,
      },
      select: { id: true },
    });
    try {
      let headers: Record<string, string> = {};
      if (endpoint.secretEnc) {
        try {
          const raw = decryptSecret(endpoint.secretEnc);
          const timestamp = String(Math.floor(Date.now() / 1000));
          headers = {
            "slugy-timestamp": timestamp,
            "slugy-signature": sign(raw, timestamp, body),
          };
        } catch {
          // Unsigned fallback — Zapier/Make catch-hooks accept plain POSTs.
        }
      }
      await postJson(endpoint.url, body, headers);
      await db.webhookDelivery.update({
        where: { id: record.id },
        data: { status: "success", attempts: 1 },
      });
      delivered += 1;
    } catch (error) {
      await db.webhookDelivery.update({
        where: { id: record.id },
        data: {
          status: "failed",
          attempts: 1,
          lastError:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "delivery_failed",
        },
      });
    }
  }

  let slack = false;
  if (event === "lead.created" || event === "sale.created") {
    const integration = await db.integration.findUnique({
      where: { workspaceId_provider: { workspaceId, provider: "slack" } },
      select: { status: true, config: true },
    });
    if (integration?.status === "connected") {
      try {
        const cfg = (integration.config ?? {}) as {
          botToken?: string;
          channelId?: string;
          leadEvents?: boolean;
          saleEvents?: boolean;
        };
        const want =
          event === "lead.created"
            ? cfg.leadEvents !== false
            : cfg.saleEvents !== false;
        if (want && cfg.botToken && cfg.channelId) {
          await postSlackMessage({
            botToken: decryptSecret(cfg.botToken),
            channel: cfg.channelId,
            text:
              event === "lead.created"
                ? `New lead: ${(payload["customerEmail"] as string) || (payload["customerExternalId"] as string) || "unknown"} via ${(payload["slug"] as string) || "link"}`
                : `New sale: ${String(payload["saleAmount"] ?? "")} ${String(payload["saleCurrency"] ?? "")} via ${(payload["slug"] as string) || "link"}`,
          });
          slack = true;
        }
      } catch (error) {
        console.error("[integrations] slack notify failed", error);
      }
    }
  }

  return { webhooks: delivered, slack };
}
