import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthSession } from "@/lib/auth";
import { DEFAULT_LIMIT, DEFAULT_SORT } from "@/constants/links";
import { jsonWithETag } from "@/lib/http";
import {
  queryWorkspaceLinks,
  VALID_LINK_SORT_OPTIONS,
} from "@/lib/links/query-workspace-links";

const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const DEFAULT_OFFSET = 0;

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

    const search = searchParams.get("search")?.trim() ?? "";
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

    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceslug },
      select: { id: true, userId: true },
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

    if (workspace.userId !== session.user.id) {
      const member = await db.member.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: session.user.id,
          },
        },
        select: { id: true },
      });

      if (!member) {
        return NextResponse.json(
          {
            error: "Workspace not found or access denied",
            code: "WORKSPACE_NOT_FOUND",
          },
          { status: 404 },
        );
      }
    }

    const result = await queryWorkspaceLinks({
      workspaceId: workspace.id,
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
