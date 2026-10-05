import { inngest } from "../client";
import { deliverWebhookEvent } from "@/lib/integrations/deliver";

export const webhookDeliverFunction = inngest.createFunction(
  {
    id: "integrations-webhook-deliver",
    triggers: { event: "integrations/webhook.deliver" },
    retries: 8,
  },
  async ({ event, step }) => {
    const data = event.data as {
      workspaceId: string;
      event: string;
      payload: Record<string, unknown>;
    };
    if (!data?.workspaceId || !data?.event) {
      throw new Error("Missing webhook fan-out data");
    }
    return await step.run("deliver", async () => deliverWebhookEvent(data));
  },
);
