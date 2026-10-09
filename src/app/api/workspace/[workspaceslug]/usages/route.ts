import { jsonWithETag } from "@/lib/http";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/server/db";
import { FREE_PLAN, toPlanSeed } from "@/constants/data/price";
import { getSubscriptionWithPlan } from "@/lib/subscription/queries";
import { ensureCurrentUsageRecord } from "@/lib/usage/current-usage";
import { isLifetimeBillingPeriod } from "@/lib/subscription/reconcile";

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
      deletedAt: null,
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

async function getUsageData(workspaceId: string, ownerUserId: string) {
  return ensureCurrentUsageRecord(db, {
    workspaceId,
    userId: ownerUserId,
  });
}

async function getSubscriptionData(userId: string) {
  const result = await getSubscriptionWithPlan(userId);
  return result.subscription;
}

// ============================================================================
// Utilities
// ============================================================================

type SubscriptionRow = Awaited<ReturnType<typeof getSubscriptionData>>;

function isActivePro(subscription: SubscriptionRow): boolean {
  if (!subscription?.plan) return false;

  // Paid plans: pro + growth. Basic is a paid lifetime tier but never
  // marketed as "Pro" — the badge/upsell must not claim otherwise.
  const planType = subscription.plan.planType.toLowerCase();
  const isPaidPlan =
    planType === "pro" || planType === "growth" || planType === "premium";
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
    const [usage, subscription] = await Promise.all([
      getUsageData(workspace.id, workspace.userId),
      getSubscriptionData(workspace.userId),
    ]);

    const plan = subscription?.plan ?? toPlanSeed(FREE_PLAN);

    // Return usage data
    return jsonWithETag(req, {
      workspace: {
        ...workspace,
        maxClicksLimit: plan.maxClicksPerWorkspace,
        maxLinksLimit: plan.maxLinksPerWorkspace,
        maxUsers: plan.maxUsers,
      },
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
