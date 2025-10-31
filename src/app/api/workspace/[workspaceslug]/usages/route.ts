import { NextResponse } from "next/server";
import { jsonWithETag } from "@/lib/http";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/server/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const { workspaceslug } = await params;
    
    // Authenticate session
    const authResult = await getAuthSession();
    if (!authResult.success) {
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
    }
    const session = authResult.session;
    const userId = session.user.id;

    // Fetch workspace
    const workspace = await db.workspace.findFirst({
      where: {
        slug: workspaceslug,
        userId,
      },
      select: {
        id: true,
        maxClicksLimit: true,
        maxLinksLimit: true,
        maxUsers: true,
      },
    });

    if (!workspace) {
      return jsonWithETag(req, { error: "Workspace not found" }, { status: 404 });
    }

    // Fetch latest usage entry
    const usage = await db.usage.findFirst({
      where: {
        userId,
        workspaceId: workspace.id,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        clicksTracked: true,
        linksCreated: true,
        addedUsers: true,
        periodEnd: true,
      },
    });

    if (!usage) {
      console.warn(
        `No usage data found for workspaceId=${workspace.id}, userId=${userId}`,
      );
      return jsonWithETag(req, { workspace, usage: null });
    }

    return jsonWithETag(req, { workspace, usage });
  } catch (error) {
    console.error("Failed to fetch usage data:", error);
    return jsonWithETag(req, { error: "Internal server error" }, { status: 500 });
  }
}