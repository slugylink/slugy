import { NextResponse } from "next/server";
import { jsonWithETag } from "@/lib/http";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";

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

    const workspace = await db.workspace.findFirst({
      where: {
        userId: session.user.id,
        slug: context.workspaceslug,
      },
    });

    if (!workspace) {
      return jsonWithETag(req, { error: "Workspace not found" }, { status: 404 });
    }

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

    // Combine owner and members, ensuring owner is first
    const team = [
      ...(owner ? [{
        user: owner,
        role: "owner" as const,
      }] : []),
      ...members,
    ];

    return jsonWithETag(req, team, { status: 200 });
  } catch (error) {
    console.error(error);
    return jsonWithETag(req, { error: "Internal Server Error" }, { status: 500 });
  }
}
