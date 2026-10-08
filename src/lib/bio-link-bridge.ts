import { db } from "@/server/db";
import { checkLinkLimit } from "@/lib/subscription/limit-queries";
import {
  setLinkCache,
  invalidateLinkCache,
} from "@/lib/cache-utils/link-cache";
import { updateLink } from "@/lib/tinybird/slugy-links-metadata";
import { createLinkWithQuota } from "@/lib/usage/quota";

const DEFAULT_DOMAIN = "slugy.co";

/** Resolve the user's default workspace (or first accessible) for bio tracking. */
export async function getDefaultWorkspaceForBio(userId: string) {
  const workspace =
    (await db.workspace.findFirst({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true, slug: true, userId: true },
    })) ??
    (await db.workspace.findFirst({
      where: { members: { some: { userId } }, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, slug: true, userId: true },
    }));
  return workspace;
}

/**
 * Create a tracked workspace Link for a bio button.
 * Quota reservation + link insert commit atomically (see usage/quota), so a
 * failed BioLinks follow-up can never leave an orphan link with burned quota
 * — and concurrent buttons can't jointly overshoot the plan.
 * Returns the Link id/slug/domain, or null if workspace/limit unavailable
 * (caller must still create the BioLinks row with linkId=null).
 */
export async function createTrackedLinkForBio({
  userId,
  title,
  url,
}: {
  userId: string;
  title: string;
  url: string;
}): Promise<{ id: string; slug: string; domain: string } | null> {
  const workspace = await getDefaultWorkspaceForBio(userId);
  if (!workspace) return null;

  const limit = await checkLinkLimit(userId, workspace.id);
  if (!limit.canCreate) return null;

  const ownerUserId = limit.ownerUserId ?? workspace.userId;
  const maxLinks = limit.maxLimit;

  try {
    const link = await createLinkWithQuota(
      {
        workspaceId: workspace.id,
        ownerUserId,
        maxLinks,
        customSlug: null,
      },
      (tx, slug) =>
        tx.link.create({
          data: {
            workspaceId: workspace.id,
            userId,
            url,
            slug,
            domain: DEFAULT_DOMAIN,
            title: title.slice(0, 100),
          },
          select: {
            id: true,
            slug: true,
            domain: true,
            createdAt: true,
            url: true,
          },
        }),
    );

    // Rebuildable cache only — counters already committed in the quota tx.
    await setLinkCache(
      link.slug,
      {
        id: link.id,
        url: link.url,
        expiresAt: null,
        expirationUrl: null,
        password: null,
        workspaceId: workspace.id,
        domain: link.domain,
        title: title.slice(0, 100),
        image: null,
        metadesc: null,
        description: null,
        geo: null,
        trackConversion: false,
      },
      link.domain,
    ).catch(() => undefined);

    return { id: link.id, slug: link.slug, domain: link.domain };
  } catch (error) {
    console.error("[BioBridge] Failed to create tracked link:", error);
    return null;
  }
}

/** Keep the tracked Link destination/title in sync with the bio button. */
export async function syncTrackedLinkForBio(
  linkId: string,
  data: { url: string; title: string },
): Promise<void> {
  try {
    const link = await db.link.findUnique({
      where: { id: linkId },
      select: {
        slug: true,
        domain: true,
        workspaceId: true,
        createdAt: true,
        tags: { select: { tag: { select: { id: true } } } },
      },
    });
    if (!link) return;

    await db.link.update({
      where: { id: linkId },
      data: { url: data.url, title: data.title.slice(0, 100) },
    });

    // Redirects serve from cache until TTL — invalidate + refresh so the new
    // destination takes effect immediately, and push metadata so Tinybird's
    // INNER JOIN keeps resolving this link.
    await invalidateLinkCache(link.slug, link.domain).catch(() => undefined);
    await setLinkCache(
      link.slug,
      {
        id: linkId,
        url: data.url,
        expiresAt: null,
        expirationUrl: null,
        password: null,
        workspaceId: link.workspaceId,
        domain: link.domain,
        title: data.title.slice(0, 100),
        image: null,
        metadesc: null,
        description: null,
        geo: null,
        trackConversion: false,
      },
      link.domain,
    ).catch(() => undefined);
    await updateLink({
      id: linkId,
      domain: link.domain,
      slug: link.slug,
      url: data.url,
      workspaceId: link.workspaceId,
      createdAt: link.createdAt,
      tags: link.tags.map((t) => ({ tagId: t.tag.id })),
    }).catch(() => undefined);
  } catch (error) {
    console.warn("[BioBridge] Failed to sync tracked link:", linkId, error);
  }
}
