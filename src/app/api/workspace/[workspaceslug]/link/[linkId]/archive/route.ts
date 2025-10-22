import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { validateworkspaceslug } from "@/server/actions/workspace/workspace";
import { invalidateLinkCache } from "@/lib/cache-utils/link-cache";

const archiveSchema = z.object({
  isArchived: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string; linkId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const context = await params;
    
    // Validate workspace and link ownership
    const workspace = await validateworkspaceslug(
      session.user.id,
      context.workspaceslug,
    );
    if (!workspace.success || !workspace.workspace)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const link = await db.link.findUnique({
      where: { id: context.linkId, workspaceId: workspace.workspace.id },
      include: {
        customDomain: true,
      },
    });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const body = await req.json();
    const { isArchived } = archiveSchema.parse(body);

    await db.link.update({
      where: { id: context.linkId },
      data: { isArchived },
    });

    // Invalidate cache for the archived/unarchived link
    const linkDomain = link.customDomain?.domain || "slugy.co";
    await invalidateLinkCache(link.slug, linkDomain);

    return NextResponse.json({ message: isArchived ? "Link archived" : "Link unarchived" }, { status: 200 });
  } catch (error) {
    console.error("Error archiving link:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.errors },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: error.message.includes("not found") ? 404 : 400 },
      );
    }
    return NextResponse.json(
      { message: "An error occurred while archiving the link." },
      { status: 500 },
    );
  }
}
