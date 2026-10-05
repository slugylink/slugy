import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { jsonWithETag } from "@/lib/http";
import { INTEGRATION_CATALOG } from "@/lib/integrations/catalog";
import { getWorkspaceBySlugForMember } from "@/lib/integrations/workspace";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
  const { workspaceslug } = await params;
  const workspace = await getWorkspaceBySlugForMember(
    workspaceslug,
    session.user.id,
  );
  if (!workspace)
    return jsonWithETag(req, { error: "Workspace not found" }, { status: 404 });

  const [connected, webhookCount] = await Promise.all([
    db.integration.findMany({
      where: { workspaceId: workspace.id },
      select: { provider: true, status: true, metadata: true, updatedAt: true },
    }),
    db.webhookEndpoint.count({
      where: { workspaceId: workspace.id, active: true },
    }),
  ]);

  const byProvider = new Map(connected.map((c) => [c.provider, c]));
  return jsonWithETag(req, {
    integrations: INTEGRATION_CATALOG.map((entry) => ({
      ...entry,
      status: byProvider.get(entry.provider)?.status ?? "not_connected",
      updatedAt: byProvider.get(entry.provider)?.updatedAt ?? null,
    })),
    webhookCount,
  });
}
