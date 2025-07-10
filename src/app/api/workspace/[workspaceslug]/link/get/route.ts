import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { DEFAULT_LIMIT, DEFAULT_SORT } from "@/constants/links";

// Types for database queries
type LinkWhereInput = {
  workspaceId: string;
  OR?: Array<{
    description?: { contains: string; mode: "insensitive" };
    url?: { contains: string; mode: "insensitive" };
  }>;
  isArchived?: boolean;
};

type LinkOrderByInput =
  | { clicks: "desc" }
  | Array<{ lastClicked: { sort: "desc"; nulls: "last" } }>
  | { createdAt: "desc" };

// Memoized search conditions
const getSearchConditions = (
  search: string,
): NonNullable<LinkWhereInput["OR"]> => {
  if (!search.trim()) return [];

  return [
    { description: { contains: search.trim(), mode: "insensitive" as const } },
    { url: { contains: search.trim(), mode: "insensitive" as const } },
  ];
};

// Memoized order conditions
const getOrderConditions = (sortBy: string) => {
  switch (sortBy) {
    case "total-clicks":
      return { clicks: "desc" as const };
    case "last-clicked":
      return [
        { lastClicked: { sort: "desc" as const, nulls: "last" as const } },
      ];
    case "date-created":
    default:
      return { createdAt: "desc" as const };
  }
};

// Optimized link fetching with caching
const getLinksWithCount = async (
  workspaceId: string,
  conditions: LinkWhereInput,
  orderBy: LinkOrderByInput,
  offset: number,
  limit: number,
) => {
  return await db.$transaction([
    db.link.count({ where: conditions }),
    db.link.findMany({
      where: conditions,
      select: {
        id: true,
        slug: true,
        url: true,
        clicks: true,
        description: true,
        password: true,
        expiresAt: true,
        isArchived: true,
        qrCode: true,
        lastClicked: true,
        createdAt: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        creator: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy,
      skip: offset,
      take: limit,
    }),
  ]);
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate parameters
    const context = await params;
    const searchParams = request.nextUrl.searchParams;
    const workspaceslug = context.workspaceslug;
    const search = searchParams.get("search") ?? "";
    const showArchived = searchParams.get("showArchived") === "true";
    const sortBy = searchParams.get("sortBy") ?? DEFAULT_SORT;
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));
    const limit = Math.min(
      50,
      Math.max(
        1,
        parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10),
      ),
    );

    // Get workspace with access check
    const workspace = await db.workspace.findUnique({
      where: {
        slug: workspaceslug,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      select: { id: true },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    // Build query conditions
    const searchConditions = getSearchConditions(search);
    const conditions = {
      workspaceId: workspace.id,
      ...(searchConditions.length > 0 && { OR: searchConditions }),
      ...(showArchived === false && { isArchived: false }),
    };

    const orderBy = getOrderConditions(sortBy);

    // Fetch data with optimized query
    const [totalLinks, links] = await getLinksWithCount(
      workspace.id,
      conditions,
      orderBy,
      offset,
      limit,
    );

    const totalPages = Math.ceil(totalLinks / limit);

    // Handle pagination edge cases
    if (offset >= totalLinks && totalLinks > 0) {
      const [, firstPageLinks] = await getLinksWithCount(
        workspace.id,
        conditions,
        orderBy,
        0,
        limit,
      );

      return NextResponse.json({
        links: firstPageLinks,
        totalLinks,
        totalPages,
      });
    }

    return NextResponse.json({
      links,
      totalLinks,
      totalPages,
      overallCount: totalLinks,
    });
  } catch (error) {
    console.error("Error fetching links:", error);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 },
    );
  }
}
