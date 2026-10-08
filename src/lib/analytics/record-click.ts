import { primarySql } from "@/server/neon";
import { redis } from "@/lib/redis";
import { calculateUsagePeriod } from "@/lib/usage-period";
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

    const latestRows = await primarySql`
      SELECT "periodEnd" FROM usages
      WHERE "workspaceId" = ${input.workspaceId} AND "userId" = ${workspace.userId}
      ORDER BY "createdAt" DESC LIMIT 1
    `;
    const { periodStart, periodEnd } = calculateUsagePeriod(
      latestRows[0]?.periodEnd
        ? new Date(latestRows[0].periodEnd as string)
        : null,
      new Date(),
    );
    // The first statement serializes rollover on the workspace. The second
    // gets a fresh READ COMMITTED snapshot and updates both counters atomically.
    const results = await primarySql.transaction(
      [
        primarySql`SELECT id FROM workspaces WHERE id = ${input.workspaceId} FOR UPDATE`,
        primarySql`
        WITH target AS (
          SELECT l.id, w."userId", w."maxClicksLimit"
          FROM links l JOIN workspaces w ON w.id = l."workspaceId"
          WHERE l.id = ${input.linkId} AND w.id = ${input.workspaceId}
            AND l."deletedAt" IS NULL AND w."deletedAt" IS NULL
        ), current_usage AS (
          SELECT u.id FROM usages u, target t
          WHERE u."workspaceId" = ${input.workspaceId} AND u."userId" = t."userId"
            AND u."deletedAt" IS NULL AND u."periodEnd" > NOW()
          ORDER BY u."createdAt" DESC LIMIT 1
        ), incremented AS (
          UPDATE usages u SET "clicksTracked" = u."clicksTracked" + 1, "updatedAt" = NOW()
          FROM target t WHERE u.id IN (SELECT id FROM current_usage)
            AND (t."maxClicksLimit" IS NULL OR u."clicksTracked" < t."maxClicksLimit")
          RETURNING u."clicksTracked"
        ), created AS (
          INSERT INTO usages (id, "userId", "workspaceId", "linksCreated", "clicksTracked", "addedUsers", "periodStart", "periodEnd", "createdAt", "updatedAt")
          SELECT ${crypto.randomUUID()}, t."userId", ${input.workspaceId}, 0, 1,
            (SELECT COUNT(*)::int FROM members WHERE "workspaceId" = ${input.workspaceId}),
            ${periodStart.toISOString()}::timestamptz, ${periodEnd.toISOString()}::timestamptz, NOW(), NOW()
          FROM target t WHERE NOT EXISTS (SELECT 1 FROM current_usage)
            AND (t."maxClicksLimit" IS NULL OR t."maxClicksLimit" > 0)
          RETURNING "clicksTracked"
        ), tracked AS (
          SELECT "clicksTracked" FROM incremented UNION ALL SELECT "clicksTracked" FROM created
        )
        UPDATE links SET clicks = clicks + 1, "lastClicked" = NOW()
        WHERE id = ${input.linkId} AND EXISTS (SELECT 1 FROM tracked)
        RETURNING (SELECT "clicksTracked" FROM tracked LIMIT 1) AS "clicksTracked"
      `,
      ],
      { isolationLevel: "ReadCommitted" },
    );
    const tracked = results[1]?.[0];
    if (!tracked) return { ok: false, limited: true };
    if (workspace.maxClicksLimit != null) {
      await setWorkspaceLimitsCache(input.workspaceId, {
        maxClicksLimit: workspace.maxClicksLimit,
        clicksTracked: Number(tracked.clicksTracked),
      }).catch(() => undefined);
    }

    // Optional secondary counter for dashboards / debugging
    void redis.incr(`clicks:link:${input.linkId}`).catch(() => undefined);

    return { ok: true };
  } catch (error) {
    console.error("[recordLinkClick]", error);
    return { ok: false };
  }
}
