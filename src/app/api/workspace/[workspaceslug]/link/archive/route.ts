import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { jsonWithETag } from "@/lib/http";
import { headers } from "next/headers";
import { z } from "zod";
import { getWorkspaceAccess, hasRole } from "@/lib/workspace-access";
import { invalidateLinkCacheBatch } from "@/lib/cache-utils/link-cache";

const bulkArchiveSchema = z.object({
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
    
    // Check workspace access (member/admin/owner can archive links)
    const access = await getWorkspaceAccess(session.user.id, context.workspaceslug);
    if (!access.success || !access.workspace || !hasRole(access.role, "member"))
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { linkIds } = bulkArchiveSchema.parse(body);

    // Verify all links belong to the workspace and get their slugs for cache invalidation
    const links = await db.link.findMany({
      where: {
        id: { in: linkIds },
        workspaceId: access.workspace.id,
      },
      select: { id: true, slug: true },
    });

    if (links.length !== linkIds.length) {
      return jsonWithETag(req, { error: "Some links not found or access denied" }, { status: 404 });
    }

    // Archive all links
    await db.link.updateMany({
      where: {
        id: { in: linkIds },
        workspaceId: access.workspace.id,
      },
      data: { isArchived: true },
    });

    // Invalidate cache for all archived links
    const slugs = links.map(link => link.slug);
    await invalidateLinkCacheBatch(slugs);

    return jsonWithETag(req, { message: `Successfully archived ${linkIds.length} links` }, { status: 200 });
  } catch (error) {
    console.error("Error bulk archiving links:", error);
    if (error instanceof z.ZodError) {
      return jsonWithETag(
        req,
        { message: "Invalid input data", errors: error.errors },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return jsonWithETag(
        req,
        { message: error.message },
        { status: 400 },
      );
    }
    return jsonWithETag(
      req,
      { message: "An error occurred while archiving the links." },
      { status: 500 },
    );
  }
} 