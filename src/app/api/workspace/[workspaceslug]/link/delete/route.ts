import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { jsonWithETag } from "@/lib/http";
import { headers } from "next/headers";
import { z } from "zod";
import { validateWorkspaceSlug } from "@/server/actions/workspace/workspace";
import { invalidateLinkCacheBatch } from "@/lib/cache-utils/link-cache";
import { deleteLink } from "@/lib/tinybird/slugy-links-metadata";
import { waitUntil } from "@vercel/functions";

const bulkDeleteSchema = z.object({
  linkIds: z.array(z.string()).min(1, "At least one link ID is required"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
    }

    const context = await params;

    // Validate workspace access
    const workspace = await validateWorkspaceSlug(
      session.user.id,
      context.workspaceslug,
    );
    if (!workspace.success || !workspace.workspace)
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { linkIds } = bulkDeleteSchema.parse(body);

    // Verify all links belong to the workspace and get their data for cache invalidation and Tinybird
    const links = await db.link.findMany({
      where: {
        id: { in: linkIds },
        workspaceId: workspace.workspace.id,
      },
      select: {
        id: true,
        slug: true,
        url: true,
        createdAt: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (links.length !== linkIds.length) {
      return jsonWithETag(
        req,
        { error: "Some links not found or access denied" },
        { status: 404 },
      );
    }

    // Delete all links
    await db.link.deleteMany({
      where: {
        id: { in: linkIds },
        workspaceId: workspace.workspace.id,
      },
    });

    // Invalidate cache for all deleted links
    const slugs = links.map((link) => link.slug);
    await invalidateLinkCacheBatch(slugs);

    // Mark links as deleted in Tinybird (non-blocking)
    links.forEach((link) => {
      if (workspace.workspace) {
        const linkData = {
          id: link.id,
          domain: "slugy.co",
          slug: link.slug,
          url: link.url,
          workspaceId: workspace.workspace.id,
          createdAt: link.createdAt,
          tags: link.tags.map((t) => ({ tagId: t.tag.id })),
        };
        waitUntil(deleteLink(linkData));
      }
    });

    return jsonWithETag(
      req,
      { message: `Successfully deleted ${linkIds.length} links` },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error bulk deleting links:", error);
    if (error instanceof z.ZodError) {
      return jsonWithETag(
        req,
        { message: "Invalid input data", errors: error.errors },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return jsonWithETag(req, { message: error.message }, { status: 400 });
    }
    return jsonWithETag(
      req,
      { message: "An error occurred while deleting the links." },
      { status: 500 },
    );
  }
}
