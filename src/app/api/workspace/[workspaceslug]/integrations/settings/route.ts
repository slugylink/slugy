import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { jsonWithETag } from "@/lib/http";
import { requireWorkspaceOwner } from "@/lib/integrations/workspace";

const settingsSchema = z.object({
  managersOnly: z.boolean(),
});

/**
 * Owner-only workspace policy for integrations. When managersOnly is true,
 * members lose connect/manage access (owners/admins keep it). Defaults to
 * false — any member may manage integrations.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
  const { workspaceslug } = await params;
  const owner = await requireWorkspaceOwner(workspaceslug, session.user.id);
  if (!owner)
    return jsonWithETag(
      req,
      { error: "Only workspace owners can change this setting." },
      { status: 403 },
    );

  const body = settingsSchema.parse(await req.json());
  await db.workspace.update({
    where: { id: owner.id },
    data: { integrationsManagerOnly: body.managersOnly },
  });
  return jsonWithETag(req, {
    settings: { managersOnly: body.managersOnly },
  });
}
