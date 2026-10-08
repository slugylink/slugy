import { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { ensureCurrentUsageRecord } from "@/lib/usage/current-usage";
import {
  generateRandomSlug,
  isPrismaUniqueViolation,
  SlugConflictError,
} from "@/lib/link-slug";

/** Thrown when the quota row is exhausted (or rolled over mid-request). */
export class QuotaExceededError extends Error {
  constructor(message = "Link limit reached. Upgrade to Pro.") {
    super(message);
    this.name = "QuotaExceededError";
  }
}

interface QuotaInput {
  workspaceId: string;
  /** Quota is workspace-scoped — always the OWNER's usage row. */
  ownerUserId: string;
  maxLinks: number;
  /** User-supplied slug, or null for random. */
  customSlug: string | null;
  maxAttempts?: number;
}

/**
 * Atomic link creation under quota. The usage row is locked
 * (`SELECT … FOR UPDATE`) and re-checked inside the same transaction that
 * increments the counters and runs `create`, so concurrent POSTs serialize
 * instead of jointly overshooting the limit — and a dropped background task
 * can never leave an uncounted link, because there is no background task.
 *
 * Random-slug collisions retry the WHOLE transaction with a fresh slug (a
 * P2002 inside an interactive tx poisons it, so retry must be outside).
 * The quota increment rolls back with the conflict — no leaks either way.
 */
export async function createLinkWithQuota<T>(
  input: QuotaInput,
  create: (tx: Prisma.TransactionClient, slug: string) => Promise<T>,
): Promise<T> {
  const maxAttempts = input.customSlug ? 1 : (input.maxAttempts ?? 5);

  let lastError: unknown = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const slug = input.customSlug ?? generateRandomSlug();
    try {
      return await db.$transaction(async (tx) => {
        const usage = await ensureCurrentUsageRecord(tx, {
          workspaceId: input.workspaceId,
          userId: input.ownerUserId,
        });
        const rows = await tx.$queryRaw<
          Array<{ id: string; linksCreated: number }>
        >`SELECT id, "linksCreated" FROM "usages" WHERE id = ${usage.id} AND "deletedAt" IS NULL FOR UPDATE`;

        const row = rows[0];
        if (!row) {
          // Period rolled over between ensure and lock — retryable by caller.
          throw new QuotaExceededError(
            "Usage period rolled over — please retry.",
          );
        }
        if (row.linksCreated >= input.maxLinks) {
          throw new QuotaExceededError();
        }

        await tx.usage.update({
          where: { id: row.id },
          data: { linksCreated: { increment: 1 } },
        });
        await tx.workspace.update({
          where: { id: input.workspaceId },
          data: { linksUsage: { increment: 1 } },
        });

        return create(tx, slug);
      });
    } catch (error) {
      if (error instanceof QuotaExceededError) throw error;
      if (isPrismaUniqueViolation(error)) {
        lastError = error;
        if (input.customSlug) throw new SlugConflictError();
        continue; // Fresh slug next attempt; rolled-back increment leaks nothing.
      }
      throw error;
    }
  }

  throw new SlugConflictError(
    "Could not generate a unique slug, please try again.",
  );
}

/**
 * Lifetime workspace counter maintenance on delete. `Workspace.linksUsage`
 * tracks live links and always goes down on delete (floor-guarded).
 *
 * Deliberately does NOT touch `Usage.linksCreated`: link quota is MONTHLY
 * creations-based — deleting a link never refunds period quota.
 */
export async function releaseLinkQuota(input: {
  workspaceId: string;
  count: number;
}): Promise<void> {
  if (input.count <= 0) return;

  await db.workspace.updateMany({
    where: {
      id: input.workspaceId,
      linksUsage: { gte: input.count },
    },
    data: { linksUsage: { decrement: input.count } },
  });
}
