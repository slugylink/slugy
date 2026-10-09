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
  if (
    normalized === "pro" ||
    normalized === "growth" ||
    normalized === "premium"
  ) {
    return { limit: PAID_AI_QUOTA_PER_DAY, isLimited: false };
  }
  return { limit: FREE_AI_QUOTA_PER_DAY, isLimited: true };
}

export class AiQuotaUnavailableError extends Error {
  constructor() {
    super("AI quota enforcement is unavailable");
    this.name = "AiQuotaUnavailableError";
  }
}

export async function getAiQuota(
  workspaceId: string,
  planType: string | null | undefined,
): Promise<AiQuota> {
  const { limit, isLimited } = quotaForPlan(planType);
  try {
    const raw = await redis.get(quotaKey(workspaceId));
    const used = raw === null ? 0 : Number(raw);
    if (!Number.isSafeInteger(used) || used < 0)
      throw new Error("Invalid quota counter");
    return { limit, used, remaining: Math.max(0, limit - used), isLimited };
  } catch {
    throw new AiQuotaUnavailableError();
  }
}

// Check, increment, and TTL initialization are one atomic operation for every plan.
const CONSUME_QUOTA = `
local used = tonumber(redis.call('GET', KEYS[1]) or '0')
if not used or used < 0 or used ~= math.floor(used) then
  return redis.error_reply('Invalid quota counter')
end
if used >= tonumber(ARGV[1]) then return {0, used} end
used = redis.call('INCR', KEYS[1])
if redis.call('TTL', KEYS[1]) < 0 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
return {1, used}
`;

export async function consumeAiQuota(
  workspaceId: string,
  planType: string | null | undefined,
): Promise<{ allowed: boolean; quota: AiQuota }> {
  const { limit, isLimited } = quotaForPlan(planType);
  try {
    const result = await redis.eval(
      CONSUME_QUOTA,
      [quotaKey(workspaceId)],
      [limit, 86400],
    );
    if (
      !Array.isArray(result) ||
      result.length !== 2 ||
      ![0, 1].includes(result[0]) ||
      !Number.isSafeInteger(result[1]) ||
      result[1] < 0
    ) {
      throw new Error("Invalid quota response");
    }
    const [allowed, used] = result as [number, number];
    return {
      allowed: allowed === 1,
      quota: { limit, used, remaining: Math.max(0, limit - used), isLimited },
    };
  } catch {
    throw new AiQuotaUnavailableError();
  }
}
