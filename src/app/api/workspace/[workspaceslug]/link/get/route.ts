import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthSession } from "@/lib/auth";
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

// Constants for better maintainability
const VALID_SORT_OPTIONS = ["date-created", "total-clicks", "last-clicked"] as const;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const DEFAULT_OFFSET = 0;

// Input validation with better error handling
const validateInput = (params: {
  search?: string | null;
  showArchived?: string | null;
  sortBy?: string | null;
  offset?: string | null;
  limit?: string | null;
}) => {
  const errors: string[] = [];

  // Validate sortBy
  if (params.sortBy && !VALID_SORT_OPTIONS.includes(params.sortBy as typeof VALID_SORT_OPTIONS[number])) {
    errors.push(`Invalid sortBy parameter. Must be one of: ${VALID_SORT_OPTIONS.join(", ")}`);
  }

  // Validate offset
  const offset = parseInt(params.offset ?? String(DEFAULT_OFFSET), 10);
  if (isNaN(offset) || offset < 0) {
    errors.push("Offset must be a non-negative integer");
  }

  // Validate limit
  const limit = parseInt(params.limit ?? String(DEFAULT_LIMIT), 10);
  if (isNaN(limit) || limit < MIN_LIMIT || limit > MAX_LIMIT) {
    errors.push(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
  }

  return { errors, offset, limit };
};

// Generate search conditions optimized for different search term lengths
const getSearchConditions = (
  search: string,
): NonNullable<LinkWhereInput["OR"]> => {
  const trimmedSearch = search.trim();
  if (!trimmedSearch) return [];

  // For very short queries, use exact matching where possible
  if (trimmedSearch.length <= 2) {
    return [
      { description: { contains: trimmedSearch, mode: "insensitive" } },
      { url: { contains: trimmedSearch, mode: "insensitive" } },
    ];
  }

  // For longer queries, use standard contains search
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

// Optimized database query with better error handling
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
          domain: true,
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

// Helper function to calculate pagination info
const calculatePaginationInfo = (
  totalLinks: number,
  limit: number,
  offset: number,
) => {
  const totalPages = Math.ceil(totalLinks / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return {
    totalPages,
    currentPage,
    hasNextPage,
    hasPreviousPage,
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    // Get session with better error handling
    const authResult = await getAuthSession();
    if (!authResult.success) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    const session = authResult.session;

    // Parse and validate params
    const context = await params;
    const { workspaceslug } = context;

    if (!workspaceslug?.trim()) {
      return NextResponse.json(
        { error: "Invalid workspace slug", code: "INVALID_WORKSPACE" },
        { status: 400 }
      );
    }

    // Parse search parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") ?? "";
    const showArchived = searchParams.get("showArchived") === "true";
    const sortBy = searchParams.get("sortBy") ?? DEFAULT_SORT;
    const offsetParam = searchParams.get("offset") ?? String(DEFAULT_OFFSET);
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
        { 
          error: "Invalid parameters", 
          details: errors,
          code: "VALIDATION_ERROR"
        },
        { status: 400 }
      );
    }

    // Verify workspace access
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
        { 
          error: "Workspace not found or access denied",
          code: "WORKSPACE_NOT_FOUND"
        },
        { status: 404 }
      );
    }

    // Build query conditions
    const searchConditions = getSearchConditions(search);
    const conditions: LinkWhereInput = {
      workspaceId: workspace.id,
      ...(searchConditions.length > 0 ? { OR: searchConditions } : {}),
      ...(showArchived === false ? { isArchived: false } : {}),
    };

    const orderBy = getOrderConditions(sortBy);

    // Fetch data
    const { totalLinks, links } = await getLinksWithCount(
      workspace.id,
      conditions,
      orderBy,
      offset,
      limit,
    );

    // Handle edge case: offset past total results
    if (offset >= totalLinks && totalLinks > 0) {
      const { links: firstPageLinks } = await getLinksWithCount(
        workspace.id,
        conditions,
        orderBy,
        0,
        limit,
      );

      const paginationInfo = calculatePaginationInfo(totalLinks, limit, 0);

      return NextResponse.json(
        {
          links: firstPageLinks,
          totalLinks,
          ...paginationInfo,
          overallCount: totalLinks,
        },
        { status: 200 }
      );
    }

    // Calculate pagination info
    const paginationInfo = calculatePaginationInfo(totalLinks, limit, offset);

    return NextResponse.json(
      {
        links,
        totalLinks,
        ...paginationInfo,
        overallCount: totalLinks,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error fetching links:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("database")) {
        return NextResponse.json(
          { 
            error: "Database connection error",
            code: "DATABASE_ERROR"
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: "Failed to fetch links",
        code: "INTERNAL_ERROR"
      },
      { status: 500 }
    );
  }
}
