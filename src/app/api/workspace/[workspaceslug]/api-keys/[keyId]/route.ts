import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { getWorkspaceAccess } from "@/lib/workspace-access";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ workspaceslug: string; keyId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { workspaceslug, keyId } = await params;
  const access = await getWorkspaceAccess(session.user.id, workspaceslug);
  if (!access.success || !access.workspace) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  if (access.role !== "owner" && access.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const existing = await db.workspaceApiKey.findFirst({
    where: {
      id: keyId,
      workspaceId: access.workspace.id,
      deletedAt: null,
    },
  });

  if (!existing) {
    return Response.json({ message: "API key not found" }, { status: 404 });
  }

  await db.workspaceApiKey.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });

  return Response.json({ ok: true });
}
