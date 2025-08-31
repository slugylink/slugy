import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { validateworkspaceslug } from "@/server/actions/workspace/workspace";
import { invalidateLinkCache } from "@/lib/cache-utils/link-cache";
import { invalidateWorkspaceLinksCache } from "@/lib/cache-utils/workspace-cache";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string; linkId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const context = await params;
    const workspace = await validateworkspaceslug(
      session.user.id,
      context.workspaceslug,
    );
    if (!workspace.success || !workspace.workspace)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const link = await db.link.findUnique({
      where: { id: context.linkId, workspaceId: workspace.workspace.id },
    });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const linkSlug = link.slug;

    await db.link.delete({
      where: { id: context.linkId },
    });

    await Promise.all([
      invalidateLinkCache(linkSlug),
      invalidateWorkspaceLinksCache(context.workspaceslug),
    ]);

    return NextResponse.json(
      { message: "Link deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting link:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: error.message.includes("not found") ? 404 : 400 },
      );
    }
    return NextResponse.json(
      { message: "An error occurred while deleting the link." },
      { status: 500 },
    );
  }
}
