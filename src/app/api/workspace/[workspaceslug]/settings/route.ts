import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { invalidateWorkspaceCache, invalidateWorkspaceBySlug } from "@/lib/cache-utils/workspace-cache";

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
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const context = await params;

  if (!context.workspaceslug) {
    return NextResponse.json(
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
    return NextResponse.json(
      { message: "Workspace not found" },
      { status: 404 },
    );
  }

  // Parse the request body
  const { name, slug } = (await request.json()) as UpdateWorkspace;

  // Check if the new slug already exists for the user
  if (slug) {
    const existingSlug = await db.workspace.findFirst({
      where: {
        userId: session.user.id,
        slug,
      },
    });

    if (existingSlug) {
      return NextResponse.json(
        { message: "Workspace slug already exists" },
        { status: 400 },
      );
    }
  }

  // Update the workspace if valid
  const updatedWorkspace = await db.workspace.update({
    where: {
      id: workspace.id,
    },
    data: {
      name,
      slug,
    },
  });

  // Invalidate caches
  await Promise.all([
    revalidateTag("workspace"),
    revalidateTag("all-workspaces"),
    revalidateTag("workspaces"),
    revalidateTag("workspace-validation"),
    // Invalidate workspace cache for the user
    invalidateWorkspaceCache(session.user.id),
    // Invalidate specific workspace validation cache if slug changed
    slug && slug !== context.workspaceslug 
      ? invalidateWorkspaceBySlug(session.user.id, context.workspaceslug)
      : Promise.resolve(),
  ]);

  return NextResponse.json(updatedWorkspace);
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

    await db.workspace.delete({
      where: {
        id: workspace.id,
      },
    });

    // Invalidate caches
    await Promise.all([
      revalidateTag("workspace"),
      revalidateTag("all-workspaces"),
      revalidateTag("workspaces"),
      revalidateTag("workspace-validation"),
      revalidateTag("links"),
      // Invalidate workspace cache for the user
      invalidateWorkspaceCache(session.user.id),
      // Invalidate specific workspace validation cache
      invalidateWorkspaceBySlug(session.user.id, context.workspaceslug),
    ]);

    return NextResponse.json({ message: "Workspace deleted successfully" });
  } catch (error) {
    console.error("[WORKSPACE_DELETE]", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
