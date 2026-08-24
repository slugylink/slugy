import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { welcomeEmailFunction } from "@/inngest/functions/welcome-email";

// Inngest will expose the function runner at `/api/inngest`.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [welcomeEmailFunction],
});
