import { NextResponse } from "next/server";
import { jsonWithETag } from "@/lib/http";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { z } from "zod";
import { headers } from "next/headers";
import { getWorkspaceAccess, hasRole } from "@/lib/workspace-access";

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
      return jsonWithETag(req, { message: "Unauthorized" }, { status: 401 });
    }

    const context = await params;
    // Check workspace access (member/admin/owner can edit tags)
    const access = await getWorkspaceAccess(session.user.id, context.workspaceslug);
    if (!access.success || !access.workspace || !hasRole(access.role, "member"))
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });

    // Check if tag exists and belongs to the workspace
    const existingTag = await db.tag.findFirst({
      where: {
        id: context.tagId,
        workspaceId: access.workspace.id,
      },
    });

    if (!existingTag) {
      return jsonWithETag(req, { error: "Tag not found" }, { status: 404 });
    }

    // Validate request body
    const body = (await req.json()) as UpdateTagRequest;
    const validatedData = updateTagSchema.parse(body);

    // Check if tag name already exists in the workspace
    if (validatedData.name !== existingTag.name) {
      const existingTagWithName = await db.tag.findFirst({
        where: {
          workspaceId: access.workspace.id,
          name: validatedData.name,
        },
      });

      if (existingTagWithName) {
        return jsonWithETag(req, { error: "Tag name already exists" }, { status: 400 });
      }
    }

    // Update the tag (scoped by workspace)
    await db.tag.updateMany({
      where: {
        id: context.tagId,
        workspaceId: access.workspace.id,
      },
      data: {
        name: validatedData.name,
        color: validatedData.color,
      },
    });

    const updatedTag = await db.tag.findFirst({
      where: {
        id: context.tagId,
        workspaceId: access.workspace.id,
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

    if (!updatedTag) {
      return jsonWithETag(req, { error: "Tag not found" }, { status: 404 });
    }

    // Transform the response to include linkCount
    const tagWithLinkCount = {
      id: updatedTag.id,
      name: updatedTag.name,
      color: updatedTag.color,
      linkCount: updatedTag._count.links,
    };

    return jsonWithETag(req, tagWithLinkCount, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonWithETag(req, { error: "Invalid request data", details: error.errors }, { status: 400 });
    }

    console.error("[TAG_UPDATE]", error);
    return jsonWithETag(req, { error: "Internal Server Error" }, { status: 500 });
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
      return jsonWithETag(req, { message: "Unauthorized" }, { status: 401 });
    }

    const context = await params;

    // Check workspace access (member/admin/owner can delete tags)
    const access = await getWorkspaceAccess(session.user.id, context.workspaceslug);
    if (!access.success || !access.workspace || !hasRole(access.role, "member"))
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });

    // Check if tag exists and belongs to the workspace
    const tag = await db.tag.findFirst({
      where: {
        id: context.tagId,
        workspaceId: access.workspace.id,
      },
    });

    if (!tag) {
      return jsonWithETag(req, { error: "Tag not found" }, { status: 404 });
    }

    // Delete the tag (scoped by workspace)
    await db.tag.deleteMany({
      where: {
        id: context.tagId,
        workspaceId: access.workspace.id,
      },
    });

    return jsonWithETag(req, { message: "Tag deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("[TAG_DELETE]", error);
    return jsonWithETag(req, { error: "Internal Server Error" }, { status: 500 });
  }
}
