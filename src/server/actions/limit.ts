"use server";
import { db } from "@/server/db";
import { getSubscriptionWithPlan } from "./subscription";

//* Optimized function to check workspace access and link limits in one query
export async function checkWorkspaceAccessAndLimits(
  userId: string,
  workspaceslug: string,
) {
  try {
    // Get user's subscription with plan details
    const subscriptionResult = await getSubscriptionWithPlan(userId);

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

    // Single query to get workspace and link count
    const workspace = await db.workspace.findFirst({
      where: {
        slug: workspaceslug,
        OR: [
          { userId },
          {
            members: {
              some: { userId },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            links: true,
          },
        },
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

    const currentLinks = workspace._count.links;
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

    if (!subscriptionResult.success || !subscriptionResult.subscription) {
      return {
        canCreate: false,
        message: "No active subscription found",
        currentCount: 0,
        maxLimit: 0,
      };
    }

    const { subscription } = subscriptionResult;
    const maxWorkspaces = subscription.plan.maxWorkspaces;

    // Count current workspaces for this user
    const currentWorkspaceCount = await db.workspace.count({
      where: { userId },
    });

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
    const subscriptionResult = await getSubscriptionWithPlan(userId);

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
    // Get user's subscription with plan details
    const subscriptionResult = await getSubscriptionWithPlan(userId);

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

    // Count current links for this user
    const currentLinkCount = await db.link.count({
      where: { userId, workspaceId },
    });

    const canCreate = currentLinkCount < maxLinks;

    return {
      canCreate,
      message: canCreate
        ? "Can create link"
        : `Link limit reached. Upgrade to Pro.`,
      currentCount: currentLinkCount,
      maxLimit: maxLinks,
      planType: subscription.plan.planType,
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
    const subscriptionResult = await getSubscriptionWithPlan(userId);
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
    const subscriptionResult = await getSubscriptionWithPlan(userId);
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

export async function checkDomainLimit(workspaceId: string, maxDomains: number) {
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
        : `Custom domain limit reached. Upgrade to Pro for more domains.`,
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
