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

// Input validation
const validateInput = (params: {
  search?: string | null;
  showArchived?: string | null;
  sortBy?: string | null;
  offset?: string | null;
  limit?: string | null;
}) => {
  const errors: string[] = [];

  // Validate sortBy
  const validSortOptions = ["date-created", "total-clicks", "last-clicked"];
  if (params.sortBy && !validSortOptions.includes(params.sortBy)) {
    errors.push("Invalid sortBy parameter");
  }

  // Validate offset
  const offset = parseInt(params.offset ?? "0", 10);
  if (isNaN(offset) || offset < 0) {
    errors.push("Invalid offset parameter");
  }

  // Validate limit
  const limit = parseInt(params.limit ?? String(DEFAULT_LIMIT), 10);
  if (isNaN(limit) || limit < 1 || limit > 100) {
    errors.push("Invalid limit parameter (must be between 1 and 100)");
  }

  return { errors, offset, limit };
};

// Generate search conditions optimized for short and long search terms
const getSearchConditions = (
  search: string,
): NonNullable<LinkWhereInput["OR"]> => {
  const trimmedSearch = search.trim();
  if (!trimmedSearch) return [];

  // Use efficient search for short queries (<= 3 characters)
  if (trimmedSearch.length <= 3) {
    return [
      { description: { contains: trimmedSearch, mode: "insensitive" } },
      { url: { contains: trimmedSearch, mode: "insensitive" } },
    ];
  }

  // For longer queries, similar conditions, possible future optimization here
  return [
    { description: { contains: trimmedSearch, mode: "insensitive" } },
    { url: { contains: trimmedSearch, mode: "insensitive" } },
  ];
};

// Determine 'orderBy' condition based on sortBy param
const getOrderConditions = (sortBy: string): LinkOrderByInput => {
  switch (sortBy) {
    case "total-clicks":
      return { clicks: "desc" };
    case "last-clicked":
      return [{ lastClicked: { sort: "desc", nulls: "last" } }];
    case "date-created":
    default:
      return { createdAt: "desc" };
  }
};

const getLinksWithCount = async (
  workspaceId: string,
  conditions: LinkWhereInput,
  orderBy: LinkOrderByInput,
  offset: number,
  limit: number,
) => {
  try {
    const [totalLinks, links] = await db.$transaction([
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
          qrCode: {
            select: {
              id: true,
              customization: true,
            },
          },
          lastClicked: true,
          createdAt: true,
          expirationUrl: true,
          tags: {
            select: {
              tag: {
                select: { id: true, name: true, color: true },
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

    return { totalLinks, links };
  } catch (error) {
    console.error("Database transaction failed:", error);
    throw new Error("Failed to fetch links from database");
  }
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

    const context = await params;
    const { workspaceslug } = context;

    if (!workspaceslug || workspaceslug.length < 1) {
      return NextResponse.json(
        { error: "Invalid workspace slug" },
        { status: 400 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") ?? "";
    const showArchived = searchParams.get("showArchived") === "true";
    const sortBy = searchParams.get("sortBy") ?? DEFAULT_SORT;
    const offsetParam = searchParams.get("offset") ?? "0";
    const limitParam = searchParams.get("limit") ?? String(DEFAULT_LIMIT);

    const { errors, offset, limit } = validateInput({
      search,
      showArchived: searchParams.get("showArchived"),
      sortBy,
      offset: offsetParam,
      limit: limitParam,
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Invalid parameters", details: errors },
        { status: 400 },
      );
    }

    const workspace = await db.workspace.findFirst({
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
        { error: "Workspace not found or access denied" },
        { status: 404 },
      );
    }

    const searchConditions = getSearchConditions(search);
    const conditions: LinkWhereInput = {
      workspaceId: workspace.id,
      ...(searchConditions.length > 0 ? { OR: searchConditions } : {}),
      ...(showArchived === false ? { isArchived: false } : {}),
    };

    const orderBy = getOrderConditions(sortBy);

    const { totalLinks, links } = await getLinksWithCount(
      workspace.id,
      conditions,
      orderBy,
      offset,
      limit,
    );

    const totalPages = Math.ceil(totalLinks / limit);

    // Pagination edge case: offset past total, reset to first page
    if (offset >= totalLinks && totalLinks > 0) {
      const { links: firstPageLinks } = await getLinksWithCount(
        workspace.id,
        conditions,
        orderBy,
        0,
        limit,
      );

      return NextResponse.json(
        {
          links: firstPageLinks,
          totalLinks,
          totalPages,
          currentPage: 1,
          hasNextPage: totalPages > 1,
          hasPreviousPage: false,
        },
        { status: 200 },
      );
    }

    const currentPage = Math.floor(offset / limit) + 1;
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

    return NextResponse.json(
      {
        links,
        totalLinks,
        totalPages,
        currentPage,
        hasNextPage,
        hasPreviousPage,
        overallCount: totalLinks,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching links:", error);

    if (error instanceof Error && error.message.includes("database")) {
      return NextResponse.json(
        { error: "Database connection error" },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 },
    );
  }
}
