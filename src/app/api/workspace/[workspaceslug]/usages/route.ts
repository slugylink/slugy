import { jsonWithETag } from "@/lib/http";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/server/db";
import { ensureCurrentUsageRecord } from "@/lib/usage/current-usage";

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
  return db.subscription.findFirst({
    where: {
      user: { id: userId },
      status: { in: ["active", "trialing"] },
      OR: [{ cancelAtPeriodEnd: false }, { cancelAtPeriodEnd: undefined }],
    },
    select: {
      id: true,
      status: true,
      cancelAtPeriodEnd: true,
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

function isActivePro(subscription: any): boolean {
  if (!subscription?.plan) return false;

  const isPaidPlan = subscription.plan.planType.toLowerCase() === "pro";
  const isActiveStatus =
    subscription.status === "active" || subscription.status === "trialing";
  const isNotCanceled = !subscription.cancelAtPeriodEnd;

  return isPaidPlan && isActiveStatus && isNotCanceled;
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
