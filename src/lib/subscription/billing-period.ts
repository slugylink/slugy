/** Basic alone is a lifetime purchase; a recurring discount never extends access. */
export function isLifetimePlan(planType: string | null | undefined): boolean {
  return planType?.toLowerCase() === "basic";
}

/** Detect the historical bug that stored recurring discounts as 100-year periods. */
export function hasInvalidRecurringPeriod(
  planType: string | null | undefined,
  start: Date,
  end: Date,
): boolean {
  return (
    ["pro", "growth", "premium"].includes(planType?.toLowerCase() ?? "") &&
    end.getTime() - start.getTime() > 2 * 366 * 86400000
  );
}
