import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { jsonWithETag } from "@/lib/http";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import {
  invalidateWorkspaceCache,
  invalidateWorkspaceBySlug,
} from "@/lib/cache-utils/workspace-cache";

interface UpdateWorkspace {
  name?: string;
  slug?: string;
}

// * Update a workspace name and slug
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return jsonWithETag(request, { message: "Unauthorized" }, { status: 401 });
  }

  const context = await params;

  if (!context.workspaceslug) {
    return jsonWithETag(
      request,
      { message: "Workspace slug is required" },
      { status: 400 },
    );
  }

  // Find the workspace based on the user ID and slug
  const workspace = await db.workspace.findFirst({
    where: {
      userId: session.user.id,
      slug: context.workspaceslug,
    },
  });

  if (!workspace) {
    return jsonWithETag(
      request,
      { message: "Workspace not found" },
      { status: 404 },
    );
  }

  // Parse the request body
  const { name, slug } = (await request.json()) as UpdateWorkspace;

  // Slug format matches the create-workspace form (lowercase, hyphens).
  if (slug) {
    if (slug.length > 30 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return jsonWithETag(
        request,
        {
          message:
            "Slug must be lowercase letters/numbers with hyphens (max 30 chars)",
        },
        { status: 400 },
      );
    }
  }

  // Slug is globally unique — check across ALL users, not just the caller.
  // A per-user check lets cross-user collisions fall through to an
  // unhandled P2002 500.
  if (slug && slug !== context.workspaceslug) {
    const existingSlug = await db.workspace.findFirst({
      where: { slug },
      select: { id: true },
    });

    if (existingSlug) {
      return jsonWithETag(
        request,
        { message: "Workspace slug already exists" },
        { status: 400 },
      );
    }
  }

  // Update the workspace if valid (P2002 guard for the check→update race).
  let updatedWorkspace;
  try {
    updatedWorkspace = await db.workspace.update({
      where: {
        id: workspace.id,
      },
      data: {
        name,
        slug,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonWithETag(
        request,
        { message: "Workspace slug already exists" },
        { status: 400 },
      );
    }
    throw error;
  }

  // Get the route path from the request
  const path = new URL(request.url).pathname;

  // Invalidate caches
  await Promise.all([
    revalidateTag("workspace", "max"),
    revalidateTag("all-workspaces", "max"),
    revalidateTag("workspaces", "max"),
    revalidateTag("workspace-validation", "max"),
    // Invalidate workspace cache for the user
    invalidateWorkspaceCache(session.user.id),
    // Invalidate specific workspace validation cache if slug changed
    slug && slug !== context.workspaceslug
      ? invalidateWorkspaceBySlug(session.user.id, context.workspaceslug)
      : Promise.resolve(),
  ]);

  return jsonWithETag(request, updatedWorkspace);
}

// * Delete a workspace
export async function DELETE(
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
      return jsonWithETag(
        req,
        { message: "Workspace not found" },
        { status: 404 },
      );
    }

    // Check if the workspace is the default workspace
    if (workspace.isDefault) {
      // Find another workspace to set as the default
      const anotherWorkspace = await db.workspace.findFirst({
        where: {
          userId: session.user.id,
          id: { not: workspace.id },
        },
      });

      if (anotherWorkspace) {
        // Set the other workspace as the new default
        await db.workspace.update({
          where: { id: anotherWorkspace.id },
          data: { isDefault: true },
        });
      }
      // If no other workspace is found, no new default is set, and deletion proceeds
    }

    // Usage rows reference the workspace WITHOUT onDelete: Cascade, so they
    // must go first — otherwise the delete below dies with an FK 500.
    // (All other workspace dependents cascade at the DB level.)
    await db.$transaction([
      db.usage.deleteMany({ where: { workspaceId: workspace.id } }),
      db.workspace.delete({ where: { id: workspace.id } }),
    ]);

    // Get the route path from the request
    const path = new URL(req.url).pathname;

    // Invalidate caches
    await Promise.all([
      revalidateTag("workspace", "max"),
      revalidateTag("all-workspaces", "max"),
      revalidateTag("workspaces", "max"),
      revalidateTag("workspace-validation", "max"),
      revalidateTag("links", "max"),
      // Invalidate workspace cache for the user
      invalidateWorkspaceCache(session.user.id),
      // Invalidate specific workspace validation cache
      invalidateWorkspaceBySlug(session.user.id, context.workspaceslug),
    ]);

    return jsonWithETag(req, { message: "Workspace deleted successfully" });
  } catch (error) {
    console.error("[WORKSPACE_DELETE]", error);
    return jsonWithETag(
      req,
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
