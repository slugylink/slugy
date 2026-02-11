import { jsonWithETag } from "@/lib/http";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/server/db";

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
      maxClicksLimit: true,
      maxLinksLimit: true,
      maxUsers: true,
    },
  });
}

async function getUsageData(workspaceslug: string, userId: string) {
  return db.usage.findFirst({
    where: {
      workspace: {
        slug: workspaceslug,
        ...buildWorkspaceAccessFilter(userId),
      },
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      clicksTracked: true,
      linksCreated: true,
      addedUsers: true,
      periodStart: true,
      periodEnd: true,
    },
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

  const isPaidPlan = subscription.plan.planType.toLowerCase() !== "free";
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
    const [workspace, usage, subscription] = await Promise.all([
      getWorkspaceData(workspaceslug, userId),
      getUsageData(workspaceslug, userId),
      getSubscriptionData(userId),
    ]);

    // Validate workspace exists and user has access
    if (!workspace) {
      return jsonWithETag(
        req,
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

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
