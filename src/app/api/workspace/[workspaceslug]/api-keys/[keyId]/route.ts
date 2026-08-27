import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { jsonWithETag } from "@/lib/http";

async function getWorkspaceForUser(workspaceslug: string, userId: string) {
  return db.workspace.findFirst({
    where: {
      slug: workspaceslug,
      deletedAt: null,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: { id: true, userId: true },
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string; keyId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceslug, keyId } = await params;
  const workspace = await getWorkspaceForUser(workspaceslug, session.user.id);
  if (!workspace) {
    return jsonWithETag(req, { error: "Workspace not found" }, { status: 404 });
  }

  if (workspace.userId !== session.user.id) {
    return jsonWithETag(req, { error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.workspaceApiKey.findFirst({
    where: {
      id: keyId,
      workspaceId: workspace.id,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!existing) {
    return jsonWithETag(req, { error: "API key not found" }, { status: 404 });
  }

  await db.workspaceApiKey.update({
    where: { id: keyId },
    data: { deletedAt: new Date() },
  });

  return jsonWithETag(req, { success: true });
}
