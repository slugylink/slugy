/** Usage period length: 29 days; reset at end of 29th day */
export const USAGE_PERIOD_DAYS = 29;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function startOfNextDay(d: Date): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + 1);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Build period end from period start: start + USAGE_PERIOD_DAYS at 23:59:59.999 */
function periodEndFromStart(periodStart: Date): Date {
  const end = addDays(periodStart, USAGE_PERIOD_DAYS);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Calculate the next usage period (29 days, reset at end of 29th day).
 * @param currentPeriodEnd - End of current period, or null for new workspaces
 * @param now - Reference time (default: now)
 */
export function calculateUsagePeriod(
  currentPeriodEnd: Date | null,
  now: Date = new Date(),
): { periodStart: Date; periodEnd: Date } {
  if (!currentPeriodEnd) {
    const periodStart = new Date(now);
    return { periodStart, periodEnd: periodEndFromStart(periodStart) };
  }

  let periodStart = startOfNextDay(currentPeriodEnd);
  let periodEnd = periodEndFromStart(periodStart);

  while (periodEnd <= now) {
    periodStart = startOfNextDay(periodEnd);
    periodEnd = periodEndFromStart(periodStart);
  }

  return { periodStart, periodEnd };
}

/**
 * True if the usage period has ended (now >= periodEnd).
 */
export function isUsagePeriodExpired(
  periodEnd: Date,
  now: Date = new Date(),
): boolean {
  return now >= periodEnd;
}

/**
 * Days remaining in the period (negative if expired).
 */
export function getRemainingDays(
  periodEnd: Date,
  now: Date = new Date(),
): number {
  return Math.ceil((periodEnd.getTime() - now.getTime()) / MS_PER_DAY);
}

/**
 * Human-readable period range (e.g. "Jan 15, 2024 - Feb 13, 2024").
 */
export function formatUsagePeriod(periodStart: Date, periodEnd: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return `${periodStart.toLocaleDateString("en-US", opts)} - ${periodEnd.toLocaleDateString("en-US", opts)}`;
}

/**
 * Status for debugging: expired, remaining days, and status label.
 */
export function getUsagePeriodStatus(periodEnd: Date, now: Date = new Date()) {
  const expired = isUsagePeriodExpired(periodEnd, now);
  const remainingDays = getRemainingDays(periodEnd, now);
  const status = expired
    ? "EXPIRED"
    : remainingDays <= 7
      ? "EXPIRING_SOON"
      : "ACTIVE";

  return {
    expired,
    remainingDays,
    periodEnd: periodEnd.toISOString(),
    now: now.toISOString(),
    status,
  };
}

/**
 * Test usage period calculation (run manually for debugging).
 */
export function testUsagePeriodCalculation() {
  const now = new Date("2024-01-15T10:00:00Z");
  const newPeriod = calculateUsagePeriod(null, now);
  console.log("New workspace:", newPeriod.periodStart.toISOString(), "→", newPeriod.periodEnd.toISOString());

  const prevEnd = new Date("2024-01-14T23:59:59Z");
  const nextPeriod = calculateUsagePeriod(prevEnd, now);
  console.log("Next period:", nextPeriod.periodStart.toISOString(), "→", nextPeriod.periodEnd.toISOString());
}
