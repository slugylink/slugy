import { getAuthSession } from "@/lib/auth";
import { db } from "@/server/db";
import { DEFAULT_LIMIT, DEFAULT_SORT } from "@/constants/links";
import { queryWorkspaceLinks } from "@/lib/links/query-workspace-links";
import type { ApiResponse } from "@/types/link-types";

export type PrefetchLinksInput = {
  workspaceslug: string;
  search?: string | null;
  showArchived?: string | null;
  sortBy?: string | null;
  pageNo?: string | null;
  tag?: string | null;
};

/**
 * Server-side first-page (or current URL) links for SWR fallbackData.
 * Returns null when unauthenticated / unauthorized so the client can fetch.
 */
export async function prefetchWorkspaceLinks(
  input: PrefetchLinksInput,
): Promise<ApiResponse | null> {
  const authResult = await getAuthSession();
  if (!authResult.success) return null;

  const slug = input.workspaceslug?.trim();
  if (!slug) return null;

  const workspace = await db.workspace.findUnique({
    where: { slug },
    select: { id: true, userId: true },
  });
  if (!workspace) return null;

  if (workspace.userId !== authResult.session.user.id) {
    const member = await db.member.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: authResult.session.user.id,
        },
      },
      select: { id: true },
    });
    if (!member) return null;
  }

  const page = Math.max(1, Number(input.pageNo ?? 1) || 1);
  const tagIds = [
    ...new Set(
      (input.tag ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];

  const result = await queryWorkspaceLinks({
    workspaceId: workspace.id,
    search: input.search?.trim() ?? "",
    showArchived: input.showArchived === "true",
    sortBy: input.sortBy ?? DEFAULT_SORT,
    offset: (page - 1) * DEFAULT_LIMIT,
    limit: DEFAULT_LIMIT,
    tagIds,
  });

  return {
    links: result.links as ApiResponse["links"],
    totalLinks: result.totalLinks,
    totalPages: result.totalPages,
  };
}
