import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { jsonWithETag } from "@/lib/http";
import { isIntegrationEvent } from "@/lib/integrations/catalog";
import { requireIntegrationsAccess } from "@/lib/integrations/workspace";

const patchSchema = z.object({
  url: z.string().url().max(2048).optional(),
  events: z.array(z.string().min(1).max(64)).min(1).max(10).optional(),
  active: z.boolean().optional(),
});

async function getEndpoint(
  workspaceslug: string,
  userId: string,
  endpointId: string,
) {
  const workspace = await requireIntegrationsAccess(workspaceslug, userId);
  if (!workspace) return null;
  return db.webhookEndpoint.findFirst({
    where: { id: endpointId, workspaceId: workspace.id },
  });
}

export async function PATCH(
  req: Request,
  {
    params,
  }: { params: Promise<{ workspaceslug: string; endpointId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
  const { workspaceslug, endpointId } = await params;
  const existing = await getEndpoint(
    workspaceslug,
    session.user.id,
    endpointId,
  );
  if (!existing)
    return jsonWithETag(req, { error: "Not found" }, { status: 404 });

  const body = patchSchema.parse(await req.json());
  if (body.events) {
    for (const e of body.events) {
      if (!isIntegrationEvent(e)) {
        return jsonWithETag(
          req,
          { error: `Unsupported event: ${e}` },
          { status: 400 },
        );
      }
    }
  }
  const updated = await db.webhookEndpoint.update({
    where: { id: existing.id },
    data: {
      ...(body.url && { url: body.url }),
      ...(body.events && { events: body.events }),
      ...(body.active !== undefined && { active: body.active }),
    },
    select: {
      id: true,
      url: true,
      secretHint: true,
      events: true,
      active: true,
      updatedAt: true,
    },
  });
  return jsonWithETag(req, { endpoint: updated });
}

export async function DELETE(
  req: Request,
  {
    params,
  }: { params: Promise<{ workspaceslug: string; endpointId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
  const { workspaceslug, endpointId } = await params;
  const existing = await getEndpoint(
    workspaceslug,
    session.user.id,
    endpointId,
  );
  if (!existing)
    return jsonWithETag(req, { error: "Not found" }, { status: 404 });
  await db.webhookEndpoint.delete({ where: { id: existing.id } });
  return jsonWithETag(req, { ok: true });
}
