import { redis } from "@/lib/redis";

/** Free workspaces: 10 Ask-AI requests per day. Pro/Growth: unlimited (soft-capped). */
export const FREE_AI_QUOTA_PER_DAY = 10;
/** Abuse guard for paid plans — high enough to feel unlimited. */
export const PAID_AI_QUOTA_PER_DAY = 500;

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function quotaKey(workspaceId: string): string {
  return `ai:analytics-ask:${workspaceId}:${dayKey()}`;
}

export interface AiQuota {
  limit: number;
  used: number;
  remaining: number;
  isLimited: boolean;
}

export function quotaForPlan(planType: string | null | undefined): {
  limit: number;
  isLimited: boolean;
} {
  const normalized = planType?.toLowerCase();
  if (normalized === "pro" || normalized === "growth") {
    return { limit: PAID_AI_QUOTA_PER_DAY, isLimited: false };
  }
  return { limit: FREE_AI_QUOTA_PER_DAY, isLimited: true };
}

export async function getAiQuota(
  workspaceId: string,
  planType: string | null | undefined,
): Promise<AiQuota> {
  const { limit, isLimited } = quotaForPlan(planType);
  try {
    const used = Number(await redis.get(quotaKey(workspaceId))) || 0;
    return { limit, used, remaining: Math.max(0, limit - used), isLimited };
  } catch {
    return { limit, used: 0, remaining: limit, isLimited };
  }
}

/**
 * Atomically consume one quota unit. Returns the quota AFTER consuming,
 * or `allowed: false` when a limited plan is exhausted (nothing consumed).
 */
export async function consumeAiQuota(
  workspaceId: string,
  planType: string | null | undefined,
): Promise<{ allowed: boolean; quota: AiQuota }> {
  const { limit, isLimited } = quotaForPlan(planType);
  const key = quotaKey(workspaceId);

  try {
    if (isLimited) {
      const used = Number(await redis.get(key)) || 0;
      if (used >= limit) {
        return {
          allowed: false,
          quota: { limit, used, remaining: 0, isLimited },
        };
      }
    }
    const used = await redis.incr(key);
    if (used === 1) await redis.expire(key, 60 * 60 * 24);
    // Paid soft cap: block only absurd bursts.
    if (!isLimited && used > limit) {
      return {
        allowed: false,
        quota: { limit, used, remaining: 0, isLimited },
      };
    }
    return {
      allowed: true,
      quota: { limit, used, remaining: Math.max(0, limit - used), isLimited },
    };
  } catch {
    // Redis down -> fail open (AI is non-critical), still report quota.
    return {
      allowed: true,
      quota: { limit, used: 0, remaining: limit, isLimited },
    };
  }
}
