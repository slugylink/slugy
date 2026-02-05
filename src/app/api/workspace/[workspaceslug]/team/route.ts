import { jsonWithETag } from "@/lib/http";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { getWorkspaceAccess } from "@/lib/workspace-access";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return jsonWithETag(req, { message: "Unauthorized" }, { status: 401 });
    }

    const context = await params;

    // Check workspace access and get user's role
    const access = await getWorkspaceAccess(session.user.id, context.workspaceslug);
    if (!access.success || !access.workspace) {
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 403 });
    }

    const workspace = await db.workspace.findFirst({
      where: {
        id: access.workspace.id,
      },
    });

    if (!workspace) {
      return jsonWithETag(req, { error: "Workspace not found" }, { status: 404 });
    }

    const isOwner = access.role === "owner";
    const canManageTeam = access.role === "owner" || access.role === "admin";

    // Get workspace members (excluding the owner to avoid duplicates)
    const members = await db.member.findMany({
      where: {
        workspaceId: workspace.id,
        userId: {
          not: workspace.userId, // Exclude the workspace owner
        },
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        role: true,
      },
      orderBy: [
        { role: "asc" },
        { createdAt: "asc" },
      ],
    });

    // Get workspace owner
    const owner = await db.user.findUnique({
      where: {
        id: workspace.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    const team = [
      ...(owner ? [{ user: owner, role: "owner" as const }] : []),
      ...members,
    ];

    const invitations = await db.invitation.findMany({
      where: {
        workspaceId: workspace.id,
        status: "pending",
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        invitedAt: true,
      },
      orderBy: { invitedAt: "desc" },
    });

    return jsonWithETag(
      req,
      { members: team, invitations, isOwner, canManageTeam, role: access.role },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return jsonWithETag(req, { error: "Internal Server Error" }, { status: 500 });
  }
}
