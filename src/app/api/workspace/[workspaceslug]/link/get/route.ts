import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthSession } from "@/lib/auth";
import { DEFAULT_LIMIT, DEFAULT_SORT } from "@/constants/links";
import { jsonWithETag } from "@/lib/http";

// Types for database queries
type LinkWhereInput = {
  workspaceId: string;
  OR?: Array<{
    slug?: { contains: string; mode: "insensitive" };
    url?: { contains: string; mode: "insensitive" };
  }>;
  isArchived?: boolean;
};

type LinkOrderByInput =
  | { clicks: "desc" }
  | Array<{ lastClicked: { sort: "desc"; nulls: "last" } }>
  | { createdAt: "desc" };

// Constants for better maintainability
const VALID_SORT_OPTIONS = [
  "date-created",
  "total-clicks",
  "last-clicked",
] as const;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const DEFAULT_OFFSET = 0;

// Link select fields for database queries
const LINK_SELECT_FIELDS = {
          id: true,
          slug: true,
          url: true,
          clicks: true,
          description: true,
          password: true,
          expiresAt: true,
          isArchived: true,
          domain: true,
          image: true,
          title: true,
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
} as const;

const validateInput = (params: {
  search?: string | null;
  showArchived?: string | null;
  sortBy?: string | null;
  offset?: string | null;
  limit?: string | null;
}) => {
  const errors: string[] = [];

  if (
    params.sortBy &&
    !VALID_SORT_OPTIONS.includes(
      params.sortBy as (typeof VALID_SORT_OPTIONS)[number],
    )
  ) {
    errors.push(
      `Invalid sortBy parameter. Must be one of: ${VALID_SORT_OPTIONS.join(", ")}`,
    );
  }

  const offset = parseInt(params.offset ?? String(DEFAULT_OFFSET), 10);
  if (isNaN(offset) || offset < 0) {
    errors.push("Offset must be a non-negative integer");
  }

  const limit = parseInt(params.limit ?? String(DEFAULT_LIMIT), 10);
  if (isNaN(limit) || limit < MIN_LIMIT || limit > MAX_LIMIT) {
    errors.push(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
  }

  return { errors, offset, limit };
};

const getSearchConditions = (
  search: string,
): NonNullable<LinkWhereInput["OR"]> => {
  const trimmedSearch = search.trim();
  if (!trimmedSearch) return [];

  return [
    { slug: { contains: trimmedSearch, mode: "insensitive" } },
    { url: { contains: trimmedSearch, mode: "insensitive" } },
  ];
};

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
    const authResult = await getAuthSession();
    if (!authResult.success) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }
    const session = authResult.session;

    const context = await params;
    const { workspaceslug } = context;

    if (!workspaceslug?.trim()) {
      return NextResponse.json(
        { error: "Invalid workspace slug", code: "INVALID_WORKSPACE" },
        { status: 400 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") ?? "";
    const showArchived = searchParams.get("showArchived") === "true";
    const sortBy = searchParams.get("sortBy") ?? DEFAULT_SORT;
    const offsetParam = searchParams.get("offset") ?? String(DEFAULT_OFFSET);
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
        { 
          error: "Invalid parameters", 
          details: errors,
          code: "VALIDATION_ERROR",
        },
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
        { 
          error: "Workspace not found or access denied",
          code: "WORKSPACE_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    const searchConditions = getSearchConditions(search);
    const conditions: LinkWhereInput = {
      workspaceId: workspace.id,
      ...(searchConditions.length > 0 && { OR: searchConditions }),
      ...(!showArchived && { isArchived: false }),
    };

    const orderBy = getOrderConditions(sortBy);

    // First, get the total count to check if offset needs adjustment
    const totalLinks = await db.link.count({ where: conditions });
    
    // Adjust offset if it exceeds total links
    const adjustedOffset = offset >= totalLinks && totalLinks > 0 ? 0 : offset;

    // Fetch links with the correct offset
    const links = await db.link.findMany({
      where: conditions,
      select: LINK_SELECT_FIELDS,
      orderBy,
      skip: adjustedOffset,
      take: limit,
    });

    const paginationInfo = calculatePaginationInfo(
      totalLinks,
      limit,
      adjustedOffset,
    );

    return jsonWithETag(
      request,
      {
        links,
        totalLinks,
        ...paginationInfo,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching links:", error);

    if (error instanceof Error) {
      if (error.message.includes("database")) {
        return NextResponse.json(
          { 
            error: "Database connection error",
            code: "DATABASE_ERROR",
          },
          { status: 503 },
        );
      }
    }

    return NextResponse.json(
      { 
        error: "Failed to fetch links",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
