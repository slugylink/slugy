import { jsonWithETag } from "@/lib/http";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { z } from "zod";
import { headers } from "next/headers";

const createTagSchema = z.object({
  name: z.string().min(1).max(40),
  color: z.string().min(1).optional().nullable(),
});

type CreateTagSchema = z.infer<typeof createTagSchema>;

export async function POST(
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

    const body = (await req.json()) as CreateTagSchema;
    const validatedData = createTagSchema.parse(body);

    const context = await params;

    const workspace = await db.workspace.findFirst({
      where: {
        slug: context.workspaceslug,
        OR: [
          { userId: session.user.id },
          {
            members: {
              some: { userId: session.user.id },
            },
          },
        ],
      },
      select: {
        id: true,
        maxLinkTags: true,
      },
    });

    if (!workspace) {
      return jsonWithETag(req, { error: "Workspace not found" }, { status: 404 });
    }

    // Check the number of existing tags against workspace limit
    const tagCount = await db.tag.count({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
      },
    });

    if (workspace.maxLinkTags != null && tagCount >= workspace.maxLinkTags) {
      return jsonWithETag(
        req,
        {
          error: `Maximum number of tags (${workspace.maxLinkTags}) reached for this workspace. Upgrade to pro!`,
          code: "TAG_LIMIT_REACHED",
        },
        { status: 400 },
      );
    }

    const tag = await db.tag.create({
      data: {
        name: validatedData.name,
        color: validatedData.color,
        workspaceId: workspace.id,
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
      id: tag.id,
      name: tag.name,
      color: tag.color,
      linkCount: tag._count.links,
    };

    return jsonWithETag(req, tagWithLinkCount, { status: 201 });
  } catch (error) {
    console.error("[TAGS_POST]", error);
    return jsonWithETag(req, { error: "Internal Server Error" }, { status: 500 });
  }
}

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
        slug: context.workspaceslug,
        OR: [
          { userId: session.user.id },
          {
            members: {
              some: { userId: session.user.id },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!workspace) {
      return jsonWithETag(req, { error: "Workspace not found" }, { status: 404 });
    }
    const tags = await db.tag.findMany({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the response to include linkCount
    const tagsWithLinkCount = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      linkCount: tag._count.links,
    }));

    return jsonWithETag(req, tagsWithLinkCount);
  } catch (error) {
    console.error("[TAGS_GET]", error);
    return jsonWithETag(req, { error: "Internal Server Error" }, { status: 500 });
  }
}
