import { customAlphabet } from "nanoid";
import { db } from "@/server/db";
import { checkLinkLimit } from "@/server/actions/limit";
import { ensureCurrentUsageRecord } from "@/lib/usage/current-usage";
import { setLinkCache } from "@/lib/cache-utils/link-cache";

const nanoid = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  7,
);

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

async function generateUniqueSlug(domain: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const slug = nanoid();
    const existing = await db.link.findUnique({
      where: { slug_domain: { slug, domain } },
      select: { id: true },
    });
    if (!existing) return slug;
  }
  return `${nanoid()}${Date.now().toString(36).slice(-2)}`;
}

/**
 * Create a tracked workspace Link for a bio button.
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

  const slug = await generateUniqueSlug(DEFAULT_DOMAIN);
  const ownerUserId = limit.ownerUserId ?? workspace.userId;

  try {
    const link = await db.link.create({
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
    });

    const currentUsage = await ensureCurrentUsageRecord(db, {
      workspaceId: workspace.id,
      userId: ownerUserId,
    });

    await Promise.allSettled([
      db.workspace.update({
        where: { id: workspace.id },
        data: { linksUsage: { increment: 1 } },
      }),
      db.usage.update({
        where: { id: currentUsage.id },
        data: { linksCreated: { increment: 1 } },
      }),
      setLinkCache(
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
      ),
    ]);

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
    await db.link.update({
      where: { id: linkId },
      data: { url: data.url, title: data.title.slice(0, 100) },
    });
  } catch (error) {
    console.warn("[BioBridge] Failed to sync tracked link:", linkId, error);
  }
}
