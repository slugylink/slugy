import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { welcomeEmailFunction } from "@/inngest/functions/welcome-email";
import { linkCreatedFunction } from "@/inngest/functions/link-created";
import { polarWebhookFunction } from "@/inngest/functions/polar-webhook";

// Inngest will expose the function runner at `/api/inngest`.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [welcomeEmailFunction, linkCreatedFunction, polarWebhookFunction],
});
