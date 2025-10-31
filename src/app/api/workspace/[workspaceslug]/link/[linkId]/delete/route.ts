import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { jsonWithETag } from "@/lib/http";
import { headers } from "next/headers";
import { validateworkspaceslug } from "@/server/actions/workspace/workspace";
import { invalidateLinkCache } from "@/lib/cache-utils/link-cache";
import { deleteLink } from "@/lib/tinybird/slugy-links-metadata";
import { waitUntil } from "@vercel/functions";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string; linkId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
    }

    const context = await params;
    // Validate workspace and link ownership
    const workspace = await validateworkspaceslug(
      session.user.id,
      context.workspaceslug,
    );
    if (!workspace.success || !workspace.workspace)
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });

    const link = await db.link.findUnique({
      where: { id: context.linkId, workspaceId: workspace.workspace.id },
      include: {
        customDomain: true,
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
    if (!link) {
      return jsonWithETag(req, { error: "Link not found" }, { status: 404 });
    }

    // Store the slug and domain before deletion for cache invalidation
    const linkSlug = link.slug;
    const linkDomain = link.customDomain?.domain || "slugy.co";

    await db.link.delete({
      where: { id: context.linkId },
    });

    // Invalidate cache for the deleted link
    await invalidateLinkCache(linkSlug, linkDomain);

    // Mark link as deleted in Tinybird
    const linkData = {
      id: link.id,
      domain: link.customDomain?.domain || "slugy.co",
      slug: link.slug,
      url: link.url,
      workspaceId: workspace.workspace.id,
      createdAt: link.createdAt,
      tags: link.tags.map((t) => ({ tagId: t.tag.id })),
    };

    waitUntil(deleteLink(linkData));

    return jsonWithETag(req, { message: "Link deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting link:", error);
    if (error instanceof Error) {
      return jsonWithETag(
        req,
        { message: error.message },
        { status: error.message.includes("not found") ? 404 : 400 },
      );
    }
    return jsonWithETag(
      req,
      { message: "An error occurred while deleting the link." },
      { status: 500 },
    );
  }
}
