import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

const MAX_RESULTS = 50;

export type WorkspaceLinkOption = {
  id: string;
  title: string | null;
  url: string;
  slug: string;
  domain: string;
  image: string | null;
  clicks: string;
  alreadyAttached: boolean;
};

export type WorkspaceLinkGroup = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  links: WorkspaceLinkOption[];
};

/**
 * List the caller's workspace short links for the bio "add from workspace"
 * picker. Only live (non-archived, non-deleted) links; flags rows already
 * attached to any bio page.
 * GET /api/bio-gallery/workspace-links?search=foo
 */
export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search")?.trim() ?? "").slice(0, 200);

    const workspaces = await db.workspace.findMany({
      where: {
        deletedAt: null,
        OR: [{ userId }, { members: { some: { userId } } }],
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true, name: true, slug: true },
    });

    if (!workspaces.length) {
      return NextResponse.json({ groups: [] });
    }

    const workspaceIds = workspaces.map((w) => w.id);
    const searchFilter = search
      ? {
          OR: [
            { slug: { contains: search, mode: "insensitive" as const } },
            { url: { contains: search, mode: "insensitive" as const } },
            { title: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const links = await db.link.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        isArchived: false,
        deletedAt: null,
        ...searchFilter,
      },
      orderBy: [{ clicks: "desc" }, { createdAt: "desc" }],
      take: MAX_RESULTS,
      select: {
        id: true,
        workspaceId: true,
        title: true,
        url: true,
        slug: true,
        domain: true,
        image: true,
        clicks: true,
      },
    });

    const attached = links.length
      ? await db.bioLinks.findMany({
          where: { linkId: { in: links.map((l) => l.id) } },
          select: { linkId: true },
        })
      : [];
    const attachedIds = new Set(attached.map((a) => a.linkId));

    const byWorkspace = new Map<string, WorkspaceLinkOption[]>();
    for (const link of links) {
      const list = byWorkspace.get(link.workspaceId) ?? [];
      list.push({
        id: link.id,
        title: link.title,
        url: link.url,
        slug: link.slug,
        domain: link.domain,
        image: link.image,
        clicks:
          typeof link.clicks === "bigint"
            ? link.clicks.toString()
            : String(link.clicks),
        alreadyAttached: attachedIds.has(link.id),
      });
      byWorkspace.set(link.workspaceId, list);
    }

    const groups: WorkspaceLinkGroup[] = workspaces
      .map((w) => ({
        workspaceId: w.id,
        workspaceName: w.name,
        workspaceSlug: w.slug,
        links: byWorkspace.get(w.id) ?? [],
      }))
      .filter((g) => g.links.length > 0);

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Error fetching workspace links for bio:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspace links" },
      { status: 500 },
    );
  }
}
