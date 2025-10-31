import { NextResponse } from "next/server";
import { jsonWithETag } from "@/lib/http";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { z } from "zod";
import { invalidateWorkspaceCache } from "@/lib/cache-utils/workspace-cache";

const updateRoleSchema = z.object({
  role: z.enum(["owner", "admin", "member"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string; userId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return jsonWithETag(req, { message: "Unauthorized" }, { status: 401 });
    }

    const context = await params;
    const body = await req.json();
    const { role } = updateRoleSchema.parse(body);

    // Check if user is workspace owner
    const workspace = await db.workspace.findFirst({
      where: {
        slug: context.workspaceslug,
        userId: session.user.id, // Only workspace owner can update roles
      },
    });

    if (!workspace) {
      return jsonWithETag(req, { error: "Workspace not found or access denied" }, { status: 404 });
    }

    // Check if member exists in workspace
    const member = await db.member.findFirst({
      where: {
        workspaceId: workspace.id,
        userId: context.userId,
      },
    });

    if (!member) {
      return jsonWithETag(req, { error: "Member not found" }, { status: 404 });
    }

    // Prevent updating own role
    if (context.userId === session.user.id) {
      return jsonWithETag(req, { error: "Cannot update your own role" }, { status: 400 });
    }

    // Update member role
    await db.member.update({
      where: {
        id: member.id,
      },
      data: {
        role,
      },
    });

    // Invalidate workspace cache for both the workspace owner and the member
    await Promise.all([
      invalidateWorkspaceCache(session.user.id),
      invalidateWorkspaceCache(context.userId),
    ]);

    return jsonWithETag(req, { message: "Role updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating member role:", error);
    if (error instanceof z.ZodError) {
      return jsonWithETag(req, { error: "Invalid role value" }, { status: 400 });
    }
    return jsonWithETag(req, { error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string; userId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return jsonWithETag(req, { message: "Unauthorized" }, { status: 401 });
    }

    const context = await params;

    // Check if user is workspace owner
    const workspace = await db.workspace.findFirst({
      where: {
        slug: context.workspaceslug,
        userId: session.user.id, // Only workspace owner can remove members
      },
    });

    if (!workspace) {
      return jsonWithETag(req, { error: "Workspace not found or access denied" }, { status: 404 });
    }

    // Check if member exists in workspace
    const member = await db.member.findFirst({
      where: {
        workspaceId: workspace.id,
        userId: context.userId,
      },
    });

    if (!member) {
      return jsonWithETag(req, { error: "Member not found" }, { status: 404 });
    }

    // Prevent removing yourself
    if (context.userId === session.user.id) {
      return jsonWithETag(req, { error: "Cannot remove yourself from the workspace" }, { status: 400 });
    }

    // Prevent removing workspace owner
    if (member.role === "owner") {
      return jsonWithETag(req, { error: "Cannot remove workspace owner" }, { status: 400 });
    }

    // Remove member
    await db.member.delete({
      where: {
        id: member.id,
      },
    });

    // Invalidate workspace cache for both the workspace owner and the removed member
    await Promise.all([
      invalidateWorkspaceCache(session.user.id),
      invalidateWorkspaceCache(context.userId),
    ]);

    return jsonWithETag(req, { message: "Member removed successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error removing member:", error);
    return jsonWithETag(req, { error: "Internal Server Error" }, { status: 500 });
  }
} 