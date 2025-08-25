import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const { workspaceslug } = await params;
    
    // Authenticate session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
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
      return NextResponse.json({ workspace, usage: null });
    }

    return NextResponse.json({ workspace, usage });
  } catch (error) {
    console.error("Failed to fetch usage data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}