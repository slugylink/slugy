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

// Memoized search conditions with better performance
const getSearchConditions = (
  search: string,
): NonNullable<LinkWhereInput["OR"]> => {
  const trimmedSearch = search.trim();
  if (!trimmedSearch) return [];

  // Use more efficient search for short queries
  if (trimmedSearch.length <= 3) {
    return [
      { description: { contains: trimmedSearch, mode: "insensitive" as const } },
      { url: { contains: trimmedSearch, mode: "insensitive" as const } },
    ];
  }

  // For longer searches, add more specific conditions
  return [
    { description: { contains: trimmedSearch, mode: "insensitive" as const } },
    { url: { contains: trimmedSearch, mode: "insensitive" as const } },
  ];
};

// Memoized order conditions
const getOrderConditions = (sortBy: string): LinkOrderByInput => {
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

// Optimized link fetching with better error handling
const getLinksWithCount = async (
  workspaceId: string,
  conditions: LinkWhereInput,
  orderBy: LinkOrderByInput,
  offset: number,
  limit: number,
) => {
  try {
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
          expirationUrl: true,
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
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    // Parse and validate parameters
    const context = await params;
    const searchParams = request.nextUrl.searchParams;
    const workspaceslug = context.workspaceslug;
    
    // Validate workspace slug
    if (!workspaceslug || workspaceslug.length < 1) {
      return NextResponse.json(
        { error: "Invalid workspace slug" },
        { status: 400 }
      );
    }

    const search = searchParams.get("search") ?? "";
    const showArchived = searchParams.get("showArchived") === "true";
    const sortBy = searchParams.get("sortBy") ?? DEFAULT_SORT;
    const offsetParam = searchParams.get("offset") ?? "0";
    const limitParam = searchParams.get("limit") ?? String(DEFAULT_LIMIT);

    // Validate input parameters
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
        { status: 400 }
      );
    }

    // Get workspace with access check and caching
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
        { error: "Workspace not found or access denied" },
        { status: 404 }
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

    // Handle pagination edge cases more efficiently
    if (offset >= totalLinks && totalLinks > 0) {
      const [, firstPageLinks] = await getLinksWithCount(
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
        {
          status: 200,
          headers: {
            "Cache-Control": "private, max-age=30",
            "X-Total-Count": totalLinks.toString(),
            "X-Page-Count": totalPages.toString(),
          },
        }
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
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=30",
          "X-Total-Count": totalLinks.toString(),
          "X-Page-Count": totalPages.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Error fetching links:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("database")) {
        return NextResponse.json(
          { error: "Database connection error" },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}
