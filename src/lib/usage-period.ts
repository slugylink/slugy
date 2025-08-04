/**
 * Calculate the next usage period for a workspace
 * @param currentPeriodEnd - The end date of the current period (null for new workspaces)
 * @param now - Current date
 * @returns Object with periodStart and periodEnd dates
 */
export function calculateUsagePeriod(
  currentPeriodEnd: Date | null,
  now: Date = new Date(),
) {
  if (!currentPeriodEnd) {
    // For new workspaces, start from now
    const periodStart = new Date(now);
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    return { periodStart, periodEnd };
  }

  let periodStart = new Date(currentPeriodEnd);
  // Optional adjustment to avoid overlap:
  // periodStart.setDate(periodStart.getDate() + 1);

  let periodEnd = new Date(currentPeriodEnd);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Fast-forward periods until periodEnd is strictly after now
  while (periodEnd <= now) {
    periodStart = new Date(periodEnd);
    // periodStart.setDate(periodStart.getDate() + 1);

    periodEnd = new Date(periodEnd);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  return { periodStart, periodEnd };
}

/**
 * Test function to verify usage period calculation
 * This can be used for debugging or testing purposes
 */
export function testUsagePeriodCalculation() {
  const now = new Date("2024-01-15T10:00:00Z");

  // Test new workspace (no current period)
  const newWorkspace = calculateUsagePeriod(null, now);
  console.log("New workspace period:", {
    start: newWorkspace.periodStart.toISOString(),
    end: newWorkspace.periodEnd.toISOString(),
  });

  // Test existing workspace (with current period ending)
  const currentPeriodEnd = new Date("2024-01-31T23:59:59Z");
  const existingWorkspace = calculateUsagePeriod(currentPeriodEnd, now);
  console.log("Existing workspace period:", {
    start: existingWorkspace.periodStart.toISOString(),
    end: existingWorkspace.periodEnd.toISOString(),
  });
}

/**
 * Check if a usage period has expired
 * @param periodEnd - The end date of the usage period
 * @param now - Current date (optional, defaults to now)
 * @returns boolean indicating if the period has expired
 */
export function isUsagePeriodExpired(
  periodEnd: Date,
  now: Date = new Date(),
): boolean {
  return now >= periodEnd;
}

/**
 * Get the remaining days in a usage period
 * @param periodEnd - The end date of the usage period
 * @param now - Current date (optional, defaults to now)
 * @returns number of days remaining (negative if expired)
 */
export function getRemainingDays(
  periodEnd: Date,
  now: Date = new Date(),
): number {
  const diffTime = periodEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Format usage period for display
 * @param periodStart - Start date of the period
 * @param periodEnd - End date of the period
 * @returns Formatted string representation
 */
export function formatUsagePeriod(periodStart: Date, periodEnd: Date): string {
  const startStr = periodStart.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const endStr = periodEnd.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return `${startStr} - ${endStr}`;
}

/**
 * Get usage period status for debugging
 * @param periodEnd - End date of the period
 * @param now - Current date (optional)
 * @returns Status object with useful information
 */
export function getUsagePeriodStatus(periodEnd: Date, now: Date = new Date()) {
  const expired = isUsagePeriodExpired(periodEnd, now);
  const remainingDays = getRemainingDays(periodEnd, now);

  return {
    expired,
    remainingDays,
    periodEnd: periodEnd.toISOString(),
    now: now.toISOString(),
    status: expired
      ? "EXPIRED"
      : remainingDays <= 7
        ? "EXPIRING_SOON"
        : "ACTIVE",
  };
}
