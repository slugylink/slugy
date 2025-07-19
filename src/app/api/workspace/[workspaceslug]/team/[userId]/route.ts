import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { z } from "zod";

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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 404 },
      );
    }

    // Check if member exists in workspace
    const member = await db.member.findFirst({
      where: {
        workspaceId: workspace.id,
        userId: context.userId,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 },
      );
    }

    // Prevent updating own role
    if (context.userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot update your own role" },
        { status: 400 },
      );
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

    return NextResponse.json({ message: "Role updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating member role:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid role value" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 404 },
      );
    }

    // Check if member exists in workspace
    const member = await db.member.findFirst({
      where: {
        workspaceId: workspace.id,
        userId: context.userId,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 },
      );
    }

    // Prevent removing yourself
    if (context.userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself from the workspace" },
        { status: 400 },
      );
    }

    // Prevent removing workspace owner
    if (member.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove workspace owner" },
        { status: 400 },
      );
    }

    // Remove member
    await db.member.delete({
      where: {
        id: member.id,
      },
    });

    return NextResponse.json({ message: "Member removed successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
} 