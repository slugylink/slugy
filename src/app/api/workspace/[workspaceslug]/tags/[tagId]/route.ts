import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { z } from "zod";
import { headers } from "next/headers";

const updateTagSchema = z.object({
  name: z.string().min(1).max(40),
  color: z.string().optional(),
});

type UpdateTagRequest = z.infer<typeof updateTagSchema>;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string; tagId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const context = await params;
    const workspace = await db.workspace.findFirst({
      where: {
        userId: session.user.id,
        slug: context.workspaceslug,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    // Check if tag exists and belongs to the workspace
    const existingTag = await db.tag.findFirst({
      where: {
        id: context.tagId,
        workspaceId: workspace.id,
      },
    });

    if (!existingTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Validate request body
    const body = (await req.json()) as UpdateTagRequest;
    const validatedData = updateTagSchema.parse(body);

    // Check if tag name already exists in the workspace
    if (validatedData.name !== existingTag.name) {
      const existingTagWithName = await db.tag.findFirst({
        where: {
          workspaceId: workspace.id,
          name: validatedData.name,
        },
      });

      if (existingTagWithName) {
        return NextResponse.json(
          { error: "Tag name already exists" },
          { status: 400 },
        );
      }
    }

    // Update the tag
    const updatedTag = await db.tag.update({
      where: {
        id: context.tagId,
      },
      data: {
        name: validatedData.name,
        color: validatedData.color,
      },
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: {
            links: true,
          },
        },
      },
    });

    // Transform the response to include linkCount
    const tagWithLinkCount = {
      id: updatedTag.id,
      name: updatedTag.name,
      color: updatedTag.color,
      linkCount: updatedTag._count.links,
    };

    return NextResponse.json(tagWithLinkCount, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    console.error("[TAG_UPDATE]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string; tagId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const context = await params;

    const workspace = await db.workspace.findFirst({
      where: {
        userId: session.user.id,
        slug: context.workspaceslug,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    // Check if tag exists and belongs to the workspace
    const tag = await db.tag.findFirst({
      where: {
        id: context.tagId,
        workspaceId: workspace.id,
      },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Delete the tag
    await db.tag.delete({
      where: {
        id: context.tagId,
      },
    });

    return NextResponse.json(
      { message: "Tag deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[TAG_DELETE]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
