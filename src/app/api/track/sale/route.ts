/**
 * Deferred: sale conversion tracking (Dub-style).
 * v1 is lead-only — use POST /api/track/lead instead.
 */
export async function POST() {
  return Response.json(
    {
      message:
        "Sale tracking is not enabled yet. Use POST /api/track/lead for conversion leads.",
    },
    { status: 501 },
  );
}

/*
import { z } from "zod";
import { authenticateWorkspaceApiKey } from "@/lib/conversions/api-key-auth";
import { trackConversion } from "@/lib/conversions/track";

const saleSchema = z.object({
  clickId: z.string().min(1).max(64).optional().nullable(),
  eventName: z.string().min(1).max(255).default("Purchase"),
  customerExternalId: z.string().min(1).max(100),
  amount: z.number().int().min(0),
  currency: z.string().min(3).max(3).optional().nullable(),
  invoiceId: z.string().min(1).max(100).optional().nullable(),
  ...
});

export async function POST(req: Request) { ... trackConversion({ type: "sale", ... }) }
*/
