import { inngest } from "../client";
import {
  processPolarWebhookEvent,
  type PolarWebhookEventType,
} from "@/lib/subscription/polar-webhook-handlers";

type PolarWebhookEventData = {
  type: PolarWebhookEventType;
  payload: unknown;
  polarEventId?: string | null;
};

export const polarWebhookFunction = inngest.createFunction(
  {
    id: "polar-webhook-process",
    triggers: { event: "polar/webhook.received" },
    // Transient DB / Polar API failures should not leave billing out of sync.
    retries: 8,
  },
  async ({ event, step }) => {
    const data = event.data as PolarWebhookEventData;
    if (!data?.type) {
      throw new Error("Missing polar webhook event type");
    }

    return await step.run(`process-${data.type}`, async () => {
      return processPolarWebhookEvent(data.type, data.payload);
    });
  },
);
