import { db } from "@/server/db";
import { getSubscriptionWithPlan } from "@/lib/subscription/queries";

export function canUseLeadTracking(planType: string | null | undefined) {
  const normalized = planType?.toLowerCase();
  return normalized === "pro" || normalized === "growth";
}

/** Analytics tiers: free → clicks, pro → clicks + leads, growth → + sales. */
export type AnalyticsTier = "clicks" | "leads" | "sales";

export function analyticsTierForPlan(
  planType: string | null | undefined,
): AnalyticsTier {
  const normalized = planType?.toLowerCase();
  if (normalized === "growth") return "sales";
  if (normalized === "pro") return "leads";
  return "clicks";
}

/**
 * Sales analytics (Tinybird sales_analytics: revenue-attributed lead events).
 * Growth only.
 */
export function canUseSalesAnalytics(planType: string | null | undefined) {
  return planType?.toLowerCase() === "growth";
}

/** Whether a plan may view a given analytics event tab. */
export function canViewAnalyticsEvent(
  planType: string | null | undefined,
  event: "clicks" | "leads" | "sales",
): boolean {
  if (event === "clicks") return true;
  if (event === "leads") return canUseLeadTracking(planType);
  return canUseSalesAnalytics(planType);
}

/** Password protection + link expiration are paid features. */
export function canUsePremiumLinkFeatures(planType: string | null | undefined) {
  const normalized = planType?.toLowerCase();
  return normalized === "pro" || normalized === "growth";
}

export async function getWorkspaceOwnerUserId(
  workspaceId: string,
): Promise<string | null> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { userId: true },
  });
  return workspace?.userId ?? null;
}

export async function getWorkspaceOwnerPlanType(
  workspaceId: string,
): Promise<string | null> {
  const ownerUserId = await getWorkspaceOwnerUserId(workspaceId);
  if (!ownerUserId) return null;

  const result = await getSubscriptionWithPlan(ownerUserId);
  return result.subscription?.plan?.planType ?? null;
}

export async function getWorkspaceOwnerPlanTypeBySlug(
  workspaceslug: string,
): Promise<string | null> {
  const workspace = await db.workspace.findFirst({
    where: { slug: workspaceslug, deletedAt: null },
    select: { userId: true },
  });
  if (!workspace?.userId) return null;

  const result = await getSubscriptionWithPlan(workspace.userId);
  return result.subscription?.plan?.planType ?? null;
}
