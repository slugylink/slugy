import { db } from "@/server/db";
import { DEFAULT_LIMIT, DEFAULT_SORT } from "@/constants/links";
import { parseGeoFromCache } from "@/lib/link-targeting";
import { maskLinkPassword } from "@/lib/link-password";
import { toJsonSafe } from "@/lib/http";

type LinkWhereInput = {
  workspaceId: string;
  OR?: Array<{
    slug?: { contains: string; mode: "insensitive" };
    url?: { contains: string; mode: "insensitive" };
  }>;
  isArchived?: boolean;
  tags?: {
    some: {
      tagId: { in: string[] };
    };
  };
};

type LinkOrderByInput =
  | { clicks: "desc" }
  | Array<{ lastClicked: { sort: "desc"; nulls: "last" } }>
  | { createdAt: "desc" };

export const VALID_LINK_SORT_OPTIONS = [
  "date-created",
  "total-clicks",
  "last-clicked",
] as const;

export type LinkSortOption = (typeof VALID_LINK_SORT_OPTIONS)[number];

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
  geo: true,
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

export type QueryWorkspaceLinksInput = {
  workspaceId: string;
  search?: string;
  showArchived?: boolean;
  sortBy?: string;
  offset?: number;
  limit?: number;
  tagIds?: string[];
};

export type WorkspaceLinksResult = {
  links: ReturnType<typeof toJsonSafe>;
  totalLinks: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

function getSearchConditions(
  search: string,
): NonNullable<LinkWhereInput["OR"]> {
  const trimmedSearch = search.trim();
  if (!trimmedSearch) return [];

  return [
    { slug: { contains: trimmedSearch, mode: "insensitive" } },
    { url: { contains: trimmedSearch, mode: "insensitive" } },
  ];
}

function getOrderConditions(sortBy: string): LinkOrderByInput {
  switch (sortBy) {
    case "total-clicks":
      return { clicks: "desc" };
    case "last-clicked":
      return [{ lastClicked: { sort: "desc", nulls: "last" } }];
    case "date-created":
    default:
      return { createdAt: "desc" };
  }
}

/**
 * Shared links query for API + server prefetch.
 * Runs count + page fetch in parallel; only re-fetches if offset is past the end.
 */
export async function queryWorkspaceLinks(
  input: QueryWorkspaceLinksInput,
): Promise<WorkspaceLinksResult> {
  const search = input.search?.trim() ?? "";
  const showArchived = input.showArchived ?? false;
  const sortBy = input.sortBy ?? DEFAULT_SORT;
  const offset = Math.max(0, input.offset ?? 0);
  const limit = input.limit ?? DEFAULT_LIMIT;
  const tagIds = [...new Set((input.tagIds ?? []).filter(Boolean))];

  const searchConditions = getSearchConditions(search);
  const conditions: LinkWhereInput = {
    workspaceId: input.workspaceId,
    ...(searchConditions.length > 0 && { OR: searchConditions }),
    ...(!showArchived && { isArchived: false }),
    ...(tagIds.length > 0 && {
      tags: {
        some: {
          tagId: { in: tagIds },
        },
      },
    }),
  };

  const orderBy = getOrderConditions(sortBy);

  const [totalLinks, pageLinks] = await Promise.all([
    db.link.count({ where: conditions }),
    db.link.findMany({
      where: conditions,
      select: LINK_SELECT_FIELDS,
      orderBy,
      skip: offset,
      take: limit,
    }),
  ]);

  let links = pageLinks;
  let adjustedOffset = offset;

  // Rare: bad page_no past the end — refetch page 1
  if (offset >= totalLinks && totalLinks > 0) {
    adjustedOffset = 0;
    links = await db.link.findMany({
      where: conditions,
      select: LINK_SELECT_FIELDS,
      orderBy,
      skip: 0,
      take: limit,
    });
  }

  const totalPages = Math.ceil(totalLinks / limit) || 0;
  const currentPage = Math.floor(adjustedOffset / limit) + 1;

  const maskedLinks = links.map((link) => ({
    ...link,
    password: maskLinkPassword(link.password),
    geo: parseGeoFromCache(link.geo),
  }));

  return toJsonSafe({
    links: maskedLinks,
    totalLinks,
    totalPages,
    currentPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  }) as WorkspaceLinksResult;
}
