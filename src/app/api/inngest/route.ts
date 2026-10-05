import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { linkCreatedFunction } from "@/inngest/functions/link-created";
import { polarWebhookFunction } from "@/inngest/functions/polar-webhook";
import { webhookDeliverFunction } from "@/inngest/functions/webhook-delivery";

// Inngest will expose the function runner at `/api/inngest`.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    linkCreatedFunction,
    polarWebhookFunction,
    webhookDeliverFunction,
  ],
});
