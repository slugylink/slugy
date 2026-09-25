/**
 * Analytics retention per plan, in months. Marketed values must stay aligned
 * with query buckets (30d / 12m / all) so enforcement is exact everywhere.
 */
const RETENTION_MONTHS: Record<string, number> = {
  free: 1,
  basic: 1,
  pro: 12,
  business: 24,
};

export function getRetentionMonths(
  planType: string | null | undefined,
): number {
  const normalized = planType?.toLowerCase() ?? "";
  return RETENTION_MONTHS[normalized] ?? 1;
}

const PERIOD_ORDER = ["24h", "7d", "30d", "3m", "12m", "all"] as const;
export type RetentionPeriod = (typeof PERIOD_ORDER)[number];

const PERIOD_MAX_RETENTION_MONTHS: Record<RetentionPeriod, number> = {
  "24h": 1,
  "7d": 1,
  "30d": 1,
  "3m": 3,
  "12m": 12,
  all: Number.POSITIVE_INFINITY,
};

/**
 * Clamp a requested time period so it never exceeds the plan's retention.
 * Used by bucket-based sources (Tinybird) that can't take an exact date.
 */
export function clampPeriodByRetention(
  planType: string | null | undefined,
  period: string,
): RetentionPeriod {
  const months = getRetentionMonths(planType);
  const fallback: RetentionPeriod = months <= 1 ? "30d" : "12m";
  if (
    !(PERIOD_ORDER as readonly string[]).includes(period) ||
    PERIOD_MAX_RETENTION_MONTHS[period as RetentionPeriod] > months
  ) {
    // Walk down to the largest bucket inside retention.
    const idx = (PERIOD_ORDER as readonly string[]).indexOf(period);
    for (
      let i = Math.min(
        idx < 0 ? PERIOD_ORDER.length - 1 : idx,
        PERIOD_ORDER.length - 1,
      );
      i >= 0;
      i--
    ) {
      const candidate = PERIOD_ORDER[i]!;
      if (PERIOD_MAX_RETENTION_MONTHS[candidate] <= months) return candidate;
    }
    return fallback;
  }
  return period as RetentionPeriod;
}

/**
 * Clamp an exact start date by retention. Used by Prisma-backed queries.
 */
export function clampStartDateByRetention(
  planType: string | null | undefined,
  startDate: Date,
  now: Date = new Date(),
): Date {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - getRetentionMonths(planType));
  return startDate < cutoff ? cutoff : startDate;
}
