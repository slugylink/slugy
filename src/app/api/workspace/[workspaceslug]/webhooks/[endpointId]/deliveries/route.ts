import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { jsonWithETag } from "@/lib/http";
import { getWorkspaceBySlugForMember } from "@/lib/integrations/workspace";

export async function GET(
  req: Request,
  {
    params,
  }: { params: Promise<{ workspaceslug: string; endpointId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
  const { workspaceslug, endpointId } = await params;
  const workspace = await getWorkspaceBySlugForMember(
    workspaceslug,
    session.user.id,
  );
  if (!workspace)
    return jsonWithETag(req, { error: "Workspace not found" }, { status: 404 });

  const endpoint = await db.webhookEndpoint.findFirst({
    where: { id: endpointId, workspaceId: workspace.id },
    select: { id: true },
  });
  if (!endpoint)
    return jsonWithETag(req, { error: "Not found" }, { status: 404 });

  const deliveries = await db.webhookDelivery.findMany({
    where: { endpointId: endpoint.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      event: true,
      status: true,
      attempts: true,
      lastError: true,
      createdAt: true,
    },
  });
  return jsonWithETag(req, { deliveries });
}
