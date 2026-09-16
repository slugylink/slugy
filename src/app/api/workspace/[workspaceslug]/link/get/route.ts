import { type NextRequest, NextResponse } from "next/server";
import { DEFAULT_LIMIT, DEFAULT_SORT } from "@/constants/links";
import { jsonWithETag } from "@/lib/http";
import {
  queryWorkspaceLinks,
  VALID_LINK_SORT_OPTIONS,
} from "@/lib/links/query-workspace-links";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const DEFAULT_OFFSET = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const context = await params;
    const { workspaceslug } = context;

    const access = await requireWorkspaceAccess(workspaceslug);
    if (!access.ok) {
      return access.response;
    }

    const searchParams = request.nextUrl.searchParams;

    const search = (searchParams.get("search")?.trim() ?? "").slice(0, 200);
    const showArchived = searchParams.get("showArchived") === "true";
    const sortBy = searchParams.get("sortBy") ?? DEFAULT_SORT;
    const offsetParam = searchParams.get("offset");
    const limitParam = searchParams.get("limit");
    const tagIds = [
      ...new Set(
        (searchParams.get("tag") ?? "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];

    const offset = offsetParam ? parseInt(offsetParam, 10) : DEFAULT_OFFSET;
    const limit = limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT;

    const errors: string[] = [];

    if (
      sortBy &&
      !VALID_LINK_SORT_OPTIONS.includes(
        sortBy as (typeof VALID_LINK_SORT_OPTIONS)[number],
      )
    ) {
      errors.push(
        `Invalid sortBy parameter. Must be one of: ${VALID_LINK_SORT_OPTIONS.join(", ")}`,
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

    const result = await queryWorkspaceLinks({
      workspaceId: access.workspace.id,
      search,
      showArchived,
      sortBy,
      offset,
      limit,
      tagIds,
    });

    return jsonWithETag(request, result, { status: 200 });
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
