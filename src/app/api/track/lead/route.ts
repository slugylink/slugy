import { z } from "zod";
import { authenticateWorkspaceApiKey } from "@/lib/conversions/api-key-auth";
import { trackLead } from "@/lib/conversions/track";

const leadSchema = z.object({
  clickId: z.string().min(1).max(64),
  eventName: z.string().min(1).max(255).optional(),
  /** Your user id — creates/updates Customer and links the lead */
  externalId: z.string().min(1).max(100).optional().nullable(),
  // Back-compat alias
  customerExternalId: z.string().min(1).max(100).optional().nullable(),
  customerEmail: z.string().email().max(100).optional().nullable(),
  customerName: z.string().max(100).optional().nullable(),
  customerAvatar: z.string().max(500).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export async function POST(req: Request) {
  const auth = await authenticateWorkspaceApiKey(req, {
    conversions: "write",
  });
  if (!auth.ok) {
    return Response.json({ message: auth.message }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { message: "Validation failed", errors: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const result = await trackLead({
    workspaceId: auth.workspaceId,
    clickId: parsed.data.clickId,
    eventName: parsed.data.eventName,
    externalId: parsed.data.externalId ?? parsed.data.customerExternalId,
    customerEmail: parsed.data.customerEmail,
    customerName: parsed.data.customerName,
    customerAvatar: parsed.data.customerAvatar,
    metadata: parsed.data.metadata,
  });

  if (!result.ok) {
    return Response.json(
      { message: result.message },
      { status: result.status },
    );
  }

  return Response.json(
    { ...result.event, duplicate: result.duplicate ?? false },
    { status: result.duplicate ? 200 : 201 },
  );
}
