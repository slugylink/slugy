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
        AND "periodEnd" > NOW()
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;
    const usage = usageRows[0];
    if (!usage) {
      // No ACTIVE usage period (rollover pending — the lazy/cron rollover
      // creates it). Still count the link click so the edge counter never
      // diverges downward; the usage counter catches up next period.
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

    // Single-statement CTE: both counters move together or not at all.
    // (Neon HTTP has no interactive transactions; two Promise.all UPDATEs
    // could land one and lose the other, drifting link vs usage counts.)
    await primarySql`
      WITH updated_usage AS (
        UPDATE "usages"
        SET "clicksTracked" = "clicksTracked" + 1
        WHERE id = ${usage.id}
        RETURNING id
      )
      UPDATE "links"
      SET clicks = clicks + 1, "lastClicked" = NOW()
      WHERE id = ${input.linkId}
    `;

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
