import { Inngest } from "inngest";

// Inngest SDK reads `INNGEST_SIGNING_KEY` / `INNGEST_EVENT_KEY` from env automatically.
export const inngest = new Inngest({
  id: "slugy",
});
