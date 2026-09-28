import { jsonWithETag } from "@/lib/http";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/server/db";
import { ensureCurrentUsageRecord } from "@/lib/usage/current-usage";
import {
  isLifetimeBillingPeriod,
  reconcileUserEntitlement,
} from "@/lib/subscription/reconcile";

// ============================================================================
// Types
// ============================================================================

interface WorkspaceUsageParams {
  params: Promise<{ workspaceslug: string }>;
}

// ============================================================================
// Database Queries
// ============================================================================

function buildWorkspaceAccessFilter(userId: string) {
  return {
    OR: [
      { userId },
      {
        members: {
          some: { userId },
        },
      },
    ],
  };
}

async function getWorkspaceData(workspaceslug: string, userId: string) {
  return db.workspace.findFirst({
    where: {
      slug: workspaceslug,
      ...buildWorkspaceAccessFilter(userId),
    },
    select: {
      id: true,
      userId: true,
      maxClicksLimit: true,
      maxLinksLimit: true,
      maxUsers: true,
    },
  });
}

async function getUsageData(workspaceslug: string, ownerUserId: string) {
  const workspace = await db.workspace.findFirst({
    where: { slug: workspaceslug },
    select: { id: true },
  });

  if (!workspace) {
    return null;
  }

  return ensureCurrentUsageRecord(db, {
    workspaceId: workspace.id,
    userId: ownerUserId,
  });
}

async function getSubscriptionData(userId: string) {
  // Grace periods ARE active (core getSubscriptionWithPlan treats
  // cancelAtPeriodEnd inside periodEnd as active) — excluding them here made
  // isActivePro flicker false while billing still granted Pro.
  return db.subscription.findFirst({
    where: {
      referenceId: userId,
      status: { in: ["active", "trialing"] },
    },
    select: {
      id: true,
      status: true,
      cancelAtPeriodEnd: true,
      periodStart: true,
      periodEnd: true,
      plan: {
        select: {
          planType: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ============================================================================
// Utilities
// ============================================================================

type SubscriptionRow = Awaited<ReturnType<typeof getSubscriptionData>>;

function isActivePro(subscription: SubscriptionRow): boolean {
  if (!subscription?.plan) return false;

  // Paid plans: pro + business. Basic is a paid lifetime tier but never
  // marketed as "Pro" — the badge/upsell must not claim otherwise.
  const planType = subscription.plan.planType.toLowerCase();
  const isPaidPlan = planType === "pro" || planType === "business";
  const status = subscription.status.toLowerCase();
  const isActiveStatus = status === "active" || status === "trialing";
  if (!isActiveStatus) return false;

  // Same expiry semantics as core: grace counts until periodEnd, lifetime
  // (Basic one-time / forever-discount Pro) never expires.
  const now = new Date();
  const inPeriod =
    subscription.periodEnd > now ||
    isLifetimeBillingPeriod(
      subscription.plan.planType,
      subscription.periodStart,
      subscription.periodEnd,
    );
  return isPaidPlan && inPeriod;
}

// ============================================================================
// API Handler
// ============================================================================

export async function GET(
  req: Request,
  { params }: WorkspaceUsageParams,
): Promise<Response> {
  try {
    const { workspaceslug } = await params;

    // Authenticate user
    const authResult = await getAuthSession();
    if (!authResult.success) {
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
    }

    const userId = authResult.session.user.id;

    // Fetch data in parallel
    const workspace = await getWorkspaceData(workspaceslug, userId);

    // Validate workspace exists and user has access
    if (!workspace) {
      return jsonWithETag(
        req,
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    // Usage + subscription are workspace-scoped → use the owner's record.
    await reconcileUserEntitlement(workspace.userId);

    const [usage, subscription] = await Promise.all([
      getUsageData(workspaceslug, workspace.userId),
      getSubscriptionData(workspace.userId),
    ]);

    // Return usage data
    return jsonWithETag(req, {
      workspace,
      usage,
      subscription,
      isActivePro: isActivePro(subscription),
    });
  } catch (error) {
    console.error("Failed to fetch usage data:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonWithETag(
      req,
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
