import { primarySql } from "@/server/neon";
import { redis } from "@/lib/redis";
import {
  getWorkspaceLimitsCache,
  setWorkspaceLimitsCache,
} from "@/lib/cache-utils/workspace-cache";

/**
 * Edge-safe click counter (no Prisma / no origin HTTP hop).
 * Increments link clicks + current usage period via Neon HTTP.
 */
export async function recordLinkClick(input: {
  linkId: string;
  workspaceId: string;
  slug: string;
  domain: string;
}): Promise<{ ok: boolean; limited?: boolean }> {
  try {
    // Fast path: cached click limit
    const limits = await getWorkspaceLimitsCache(input.workspaceId).catch(
      () => null,
    );
    if (
      limits &&
      limits.maxClicksLimit != null &&
      limits.clicksTracked >= limits.maxClicksLimit
    ) {
      return { ok: false, limited: true };
    }

    const workspaceRows = await primarySql`
      SELECT "maxClicksLimit", "userId"
      FROM "workspaces"
      WHERE id = ${input.workspaceId}
      LIMIT 1
    `;
    const workspace = workspaceRows[0];
    if (!workspace) {
      return { ok: false };
    }

    const usageRows = await primarySql`
      SELECT id, "clicksTracked"
      FROM "usages"
      WHERE "workspaceId" = ${input.workspaceId}
        AND "userId" = ${workspace.userId}
        AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;
    const usage = usageRows[0];
    if (!usage) {
      // Still count the link click even if usage row is missing
      await primarySql`
        UPDATE "links"
        SET clicks = clicks + 1, "lastClicked" = NOW()
        WHERE id = ${input.linkId}
      `;
      return { ok: true };
    }

    if (
      workspace.maxClicksLimit != null &&
      usage.clicksTracked >= workspace.maxClicksLimit
    ) {
      void setWorkspaceLimitsCache(input.workspaceId, {
        maxClicksLimit: workspace.maxClicksLimit,
        clicksTracked: usage.clicksTracked,
      });
      return { ok: false, limited: true };
    }

    await Promise.all([
      primarySql`
        UPDATE "links"
        SET clicks = clicks + 1, "lastClicked" = NOW()
        WHERE id = ${input.linkId}
      `,
      primarySql`
        UPDATE "usages"
        SET "clicksTracked" = "clicksTracked" + 1
        WHERE id = ${usage.id}
      `,
    ]);

    const nextTracked = Number(usage.clicksTracked) + 1;
    if (workspace.maxClicksLimit != null) {
      void setWorkspaceLimitsCache(input.workspaceId, {
        maxClicksLimit: workspace.maxClicksLimit,
        clicksTracked: nextTracked,
      });
    }

    // Optional secondary counter for dashboards / debugging
    void redis.incr(`clicks:link:${input.linkId}`).catch(() => undefined);

    return { ok: true };
  } catch (error) {
    console.error("[recordLinkClick]", error);
    return { ok: false };
  }
}
