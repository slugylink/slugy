/**
 * Deferred: custom conversion events.
 * v1 is lead-only — use POST /api/track/lead instead.
 */
export async function POST() {
  return Response.json(
    {
      message:
        "Custom events are not enabled yet. Use POST /api/track/lead for conversion leads.",
    },
    { status: 501 },
  );
}

/*
import { z } from "zod";
import { authenticateWorkspaceApiKey } from "@/lib/conversions/api-key-auth";
import { trackConversion } from "@/lib/conversions/track";

export async function POST(req: Request) { ... trackConversion({ type: "custom", ... }) }
*/
