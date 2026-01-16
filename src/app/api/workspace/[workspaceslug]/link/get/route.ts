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
    
    // Apply defaults at API level - client only sends non-default values
    const search = searchParams.get("search")?.trim() ?? "";
    const showArchived = searchParams.get("showArchived") === "true"; // defaults to false
    const sortBy = searchParams.get("sortBy") ?? DEFAULT_SORT;
    const offsetParam = searchParams.get("offset");
    const limitParam = searchParams.get("limit");
    
    // Use defaults if not provided
    const offset = offsetParam ? parseInt(offsetParam, 10) : DEFAULT_OFFSET;
    const limit = limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT;

    // Validate parsed parameters
    const errors: string[] = [];
    
    if (
      sortBy &&
      !VALID_SORT_OPTIONS.includes(sortBy as (typeof VALID_SORT_OPTIONS)[number])
    ) {
      errors.push(
        `Invalid sortBy parameter. Must be one of: ${VALID_SORT_OPTIONS.join(", ")}`,
      );
    }
    
    if (isNaN(offset) || offset < 0) {
      errors.push("Offset must be a non-negative integer");
    }
    
    if (isNaN(limit) || limit < MIN_LIMIT || limit > MAX_LIMIT) {
      errors.push(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
    }

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

    // Optimized: Check ownership first (fast with userId index), then membership if needed
    // This avoids the slow OR/EXISTS query pattern
    let workspace = await db.workspace.findFirst({
      where: {
        slug: workspaceslug,
        userId: session.user.id, // Check ownership first (uses userId index)
      },
      select: { id: true },
    });

    // If not owner, check if user is a member
    if (!workspace) {
      workspace = await db.workspace.findFirst({
        where: {
          slug: workspaceslug,
          members: {
            some: { userId: session.user.id }, // Uses members.userId index
          },
        },
        select: { id: true },
      });
    }

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
