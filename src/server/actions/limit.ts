"use server";
import { db } from "@/server/db";
import { getSubscriptionWithPlan } from "./subscription";
import { getFreePlanLimits } from "@/lib/subscription/limits-sync";
import { ensureFreeSubscription } from "@/lib/subscription/free-entitlement";
import { ensureCurrentUsageRecord } from "@/lib/usage/current-usage";

//* Optimized function to check workspace access and link limits in one query
export async function checkWorkspaceAccessAndLimits(
  userId: string,
  workspaceslug: string,
) {
  try {
    const workspace = await db.workspace.findFirst({
      where: {
        slug: workspaceslug,
        OR: [{ userId }, { members: { some: { userId } } }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        userId: true,
      },
    });

    if (!workspace) {
      return {
        success: false,
        message: "Workspace not found or access denied",
        workspace: null,
        canCreateLinks: false,
        currentLinks: 0,
        maxLinks: 0,
      };
    }

    let subscriptionResult = await getSubscriptionWithPlan(workspace.userId);

    // Self-healing: users without any subscription (signed up before the
    // Free tier, or via OAuth edge cases) get Free instead of a hard block.
    if (!subscriptionResult.success || !subscriptionResult.subscription) {
      await ensureFreeSubscription(workspace.userId);
      subscriptionResult = await getSubscriptionWithPlan(workspace.userId);
    }

    if (!subscriptionResult.success || !subscriptionResult.subscription) {
      return {
        success: false,
        message: "No active subscription found",
        workspace: null,
        canCreateLinks: false,
        currentLinks: 0,
        maxLinks: 0,
      };
    }

    const { subscription } = subscriptionResult;
    const maxLinks = subscription.plan.maxLinksPerWorkspace;

    // Quota is workspace-scoped: key usage to the workspace OWNER so a
    // member cannot get a separate fresh counter and exceed plan limits.
    const usage = await ensureCurrentUsageRecord(db, {
      workspaceId: workspace.id,
      userId: workspace.userId,
    });
    const currentLinks = usage.linksCreated;
    const canCreateLinks = currentLinks < maxLinks;

    return {
      success: true,
      message: canCreateLinks ? "Access granted" : "Link limit reached",
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      },
      canCreateLinks,
      currentLinks,
      maxLinks,
      planType: subscription.plan.planType,
      ownerUserId: workspace.userId,
    };
  } catch (error) {
    console.error("Error checking workspace access and limits:", error);
    return {
      success: false,
      message: "Error checking workspace access",
      workspace: null,
      canCreateLinks: false,
      currentLinks: 0,
      maxLinks: 0,
    };
  }
}

export async function checkWorkspaceLimit(userId: string) {
  try {
    // Get user's subscription with plan details
    const subscriptionResult = await getSubscriptionWithPlan(userId);
    const currentWorkspaceCount = await db.workspace.count({
      where: { userId },
    });

    if (!subscriptionResult.success || !subscriptionResult.subscription) {
      await ensureFreeSubscription(userId);
      const retry = await getSubscriptionWithPlan(userId);
      const freeLimits = await getFreePlanLimits();
      const maxWorkspaces =
        retry.subscription?.plan?.maxWorkspaces ?? freeLimits.maxWorkspaces;
      const canCreate = currentWorkspaceCount < maxWorkspaces;

      return {
        canCreate,
        message: canCreate
          ? "Can create workspace"
          : `Workspace limit reached. Upgrade to Pro.`,
        currentCount: currentWorkspaceCount,
        maxLimit: maxWorkspaces,
        planType: (retry.subscription?.plan?.planType ?? "free") as
          | "free"
          | "basic"
          | "pro",
      };
    }

    const { subscription } = subscriptionResult;
    const maxWorkspaces = subscription.plan.maxWorkspaces;

    const canCreate = currentWorkspaceCount < maxWorkspaces;

    return {
      canCreate,
      message: canCreate
        ? "Can create workspace"
        : `Workspace limit reached. Upgrade to Pro.`,
      currentCount: currentWorkspaceCount,
      maxLimit: maxWorkspaces,
      planType: subscription.plan.planType,
    };
  } catch (error) {
    console.error("Error checking workspace limit:", error);
    return {
      canCreate: false,
      message: "Error checking workspace limits",
      currentCount: 0,
      maxLimit: 0,
    };
  }
}

export async function getUserWorkspaceStats(userId: string) {
  try {
    let subscriptionResult = await getSubscriptionWithPlan(userId);

    if (!subscriptionResult.success || !subscriptionResult.subscription) {
      await ensureFreeSubscription(userId);
      subscriptionResult = await getSubscriptionWithPlan(userId);
    }

    if (!subscriptionResult.success || !subscriptionResult.subscription) {
      return {
        success: false,
        message: "No active subscription found",
        stats: null,
      };
    }

    const { subscription } = subscriptionResult;
    const currentWorkspaceCount = await db.workspace.count({
      where: { userId },
    });

    return {
      success: true,
      message: "Stats retrieved successfully",
      stats: {
        currentWorkspaces: currentWorkspaceCount,
        maxWorkspaces: subscription.plan.maxWorkspaces,
        planType: subscription.plan.planType,
        planName: subscription.plan.name,
        remainingWorkspaces: Math.max(
          0,
          subscription.plan.maxWorkspaces - currentWorkspaceCount,
        ),
      },
    };
  } catch (error) {
    console.error("Error getting workspace stats:", error);
    return {
      success: false,
      message: "Error retrieving workspace stats",
      stats: null,
    };
  }
}

export async function checkLinkLimit(userId: string, workspaceId: string) {
  try {
    // Resolve the owner so quota and counters are workspace-scoped.
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { userId: true },
    });
    const ownerUserId = workspace?.userId ?? userId;

    let subscriptionResult = await getSubscriptionWithPlan(ownerUserId);

    if (!subscriptionResult.success || !subscriptionResult.subscription) {
      await ensureFreeSubscription(ownerUserId);
      subscriptionResult = await getSubscriptionWithPlan(ownerUserId);
    }

    if (!subscriptionResult.success || !subscriptionResult.subscription) {
      return {
        canCreate: false,
        message: "No active subscription found",
        currentCount: 0,
        maxLimit: 0,
      };
    }

    const { subscription } = subscriptionResult;
    const maxLinks = subscription.plan.maxLinksPerWorkspace;

    const usage = await ensureCurrentUsageRecord(db, {
      workspaceId,
      userId: ownerUserId,
    });
    const currentLinkCount = usage.linksCreated;
    const canCreate = currentLinkCount < maxLinks;

    return {
      canCreate,
      message: canCreate
        ? "Can create link"
        : `Link limit reached. Upgrade to Pro.`,
      currentCount: currentLinkCount,
      maxLimit: maxLinks,
      planType: subscription.plan.planType,
      ownerUserId,
    };
  } catch (error) {
    console.error("Error checking link limit:", error);
    return {
      canCreate: false,
      message: "Error checking link limits",
      currentCount: 0,
      maxLimit: 0,
    };
  }
}

export async function checkBioGalleryLimit(userId: string) {
  try {
    let subscriptionResult = await getSubscriptionWithPlan(userId);
    if (!subscriptionResult.success || !subscriptionResult.subscription) {
      await ensureFreeSubscription(userId);
      subscriptionResult = await getSubscriptionWithPlan(userId);
    }
    if (!subscriptionResult.success || !subscriptionResult.subscription) {
      return {
        canCreate: false,
        message: "No active subscription found",
        currentCount: 0,
        maxLimit: 0,
      };
    }
    const { subscription } = subscriptionResult;
    const maxGalleries = subscription.plan.maxGalleries;
    const currentGalleryCount = await db.bio.count({ where: { userId } });
    const canCreate = currentGalleryCount < maxGalleries;
    return {
      canCreate,
      message: canCreate
        ? "Can create bio gallery"
        : `Bio gallery limit reached. Upgrade to Pro.`,
      currentCount: currentGalleryCount,
      maxLimit: maxGalleries,
      planType: subscription.plan.planType,
    };
  } catch (error) {
    console.error("Error checking bio gallery limit:", error);
    return {
      canCreate: false,
      message: "Error checking bio gallery limits",
      currentCount: 0,
      maxLimit: 0,
    };
  }
}

export async function checkBioGalleryLinkLimit(userId: string, bioId: string) {
  try {
    // Get user's subscription with plan details
    let subscriptionResult = await getSubscriptionWithPlan(userId);
    if (!subscriptionResult.success || !subscriptionResult.subscription) {
      await ensureFreeSubscription(userId);
      subscriptionResult = await getSubscriptionWithPlan(userId);
    }
    if (!subscriptionResult.success || !subscriptionResult.subscription) {
      return {
        canCreate: false,
        message: "No active subscription found",
        currentCount: 0,
        maxLimit: 0,
      };
    }
    const { subscription } = subscriptionResult;
    const maxLinks = subscription.plan.maxLinksPerBio;
    // Count current links for this bio gallery
    const currentLinkCount = await db.bioLinks.count({ where: { bioId } });
    const canCreate = currentLinkCount < maxLinks;
    return {
      canCreate,
      message: canCreate
        ? "Can create link in bio gallery"
        : `Link limit reached for bio gallery. Upgrade to Pro for more links.`,
      currentCount: currentLinkCount,
      maxLimit: maxLinks,
      planType: subscription.plan.planType,
    };
  } catch (error) {
    console.error("Error checking bio gallery link limit:", error);
    return {
      canCreate: false,
      message: "Error checking bio gallery link limits",
      currentCount: 0,
      maxLimit: 0,
    };
  }
}

export async function checkDomainLimit(
  workspaceId: string,
  maxDomains: number,
) {
  try {
    // Count current custom domains for this workspace
    const currentDomainCount = await db.customDomain.count({
      where: { workspaceId },
    });

    const canAdd = currentDomainCount < maxDomains;

    return {
      canAdd,
      error: canAdd
        ? undefined
        : `Custom domain limit reached. Upgrade to Pro.`,
      currentCount: currentDomainCount,
      maxLimit: maxDomains,
    };
  } catch (error) {
    console.error("Error checking domain limit:", error);
    return {
      canAdd: false,
      error: "Error checking domain limits",
      currentCount: 0,
      maxLimit: maxDomains,
    };
  }
}
