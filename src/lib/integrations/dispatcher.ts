import { db } from "@/server/db";
import { inngest } from "@/inngest/client";
import type { IntegrationEventName } from "@/lib/integrations/catalog";

export interface IntegrationFanoutInput {
  workspaceId: string;
  event: IntegrationEventName;
  payload: Record<string, unknown>;
}

function payloadTooLarge(payload: Record<string, unknown>): boolean {
  try {
    return JSON.stringify(payload).length > 256_000;
  } catch {
    return true;
  }
}

/**
 * Fire-and-forget fan-out. Never throws to click/lead hot paths —
 * delivery + retries happen in the `integrations/webhook.deliver` Inngest fn.
 */
export function emitIntegrationEvent(input: IntegrationFanoutInput): void {
  if (payloadTooLarge(input.payload)) {
    console.error("[integrations] payload too large, dropping", input.event);
    return;
  }

  const send = async () => {
    const inngestConfigured = Boolean(
      process.env.INNGEST_EVENT_KEY || process.env.INNGEST_SIGNING_KEY,
    );
    if (!inngestConfigured) {
      const { deliverWebhookEvent } = await import(
        "@/lib/integrations/deliver"
      );
      await deliverWebhookEvent(input);
      return;
    }
    await inngest.send({ name: "integrations/webhook.deliver", data: input });
  };

  // Vercel waitUntil keeps delivery alive after the response; plain
  // fire-and-forget elsewhere. Dynamic import keeps edge/bundlers happy.
  void import("@vercel/functions")
    .then(({ waitUntil }) =>
      waitUntil(send().catch((e) => console.error("[integrations] emit", e))),
    )
    .catch(() => {
      void send().catch((e) => console.error("[integrations] emit", e));
    });
}

export async function listActiveEndpoints(workspaceId: string, event: string) {
  return db.webhookEndpoint.findMany({
    where: { workspaceId, active: true, events: { has: event } },
    select: { id: true, url: true, workspaceId: true },
  });
}
