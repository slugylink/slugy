"use server";
import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getActiveSubscription(userId: string) {
  try {
    const subscription = await db.subscription.findUnique({
      where: { referenceId: userId },
      select: { id: true, status: true },
    });

    if (!subscription) {
      return {
        msg: "No active subscription",
        status: false,
        subscription: null,
      };
    }

    return { msg: "Success", status: true, subscription: subscription };
  } catch (error) {
    console.error("Get active subscription error:", error);
    return { msg: "Internal server error", status: false, subscription: null };
  }
}

export async function getSubscriptionWithPlan(userId: string) {
  try {
    const subscription = await db.subscription.findUnique({
      where: { referenceId: userId },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            planType: true,
            maxWorkspaces: true,
            maxLinksPerWorkspace: true,
            maxClicksPerWorkspace: true,
            maxUsers: true,
            maxCustomDomains: true,
            maxGalleries: true,
            maxLinksPerBio: true,
            maxTagsPerWorkspace: true,
          },
        },
      },
    });

    if (!subscription) {
      return {
        success: false,
        message: "No active subscription found",
        subscription: null,
      };
    }

    return {
      success: true,
      message: "Subscription found",
      subscription,
    };
  } catch (error) {
    console.error("Error getting subscription with plan:", error);
    return {
      success: false,
      message: "Failed to get subscription",
      subscription: null,
    };
  }
}

export async function getBillingData(workspaceSlug: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        success: false,
        message: "Unauthorized",
        data: null,
      };
    }

    const userId = session.user.id;

    // Get workspace with counts
    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug, userId },
      select: {
        id: true,
        name: true,
        slug: true,
        maxLinksLimit: true,
        maxClicksLimit: true,
        maxUsers: true,
        maxLinkTags: true,
        linksUsage: true,
        clicksUsage: true,
        addedUsers: true,
        _count: {
          select: {
            customDomains: true,
            tags: true,
            members: true,
            links: true,
          },
        },
      },
    });

    if (!workspace) {
      return {
        success: false,
        message: "Workspace not found",
        data: null,
      };
    }

    // Get subscription with plan
    const subscriptionResult = await getSubscriptionWithPlan(userId);
    
    // Get bio galleries count
    const bioCount = await db.bio.count({
      where: { userId },
    });

    // Get bio links usage (max links in any single bio)
    const bioWithMostLinks = await db.bio.findFirst({
      where: { userId },
      select: {
        _count: {
          select: {
            links: true,
          },
        },
        maxLinksLimit: true,
      },
      orderBy: {
        links: {
          _count: "desc",
        },
      },
    });

    // Format billing cycle dates
    const periodStart = subscriptionResult.subscription?.periodStart || new Date();
    const periodEnd = subscriptionResult.subscription?.periodEnd || new Date();

    return {
      success: true,
      message: "Billing data retrieved",
      data: {
        plan: subscriptionResult.subscription?.plan || {
          name: "Free",
          planType: "free",
          maxWorkspaces: 2,
          maxLinksPerWorkspace: 25,
          maxClicksPerWorkspace: 1000,
          maxUsers: 1,
          maxCustomDomains: 2,
          maxGalleries: 1,
          maxLinksPerBio: 5,
          maxTagsPerWorkspace: 5,
        },
        billingCycle: {
          start: periodStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          end: periodEnd.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        },
        usage: {
          customDomains: workspace._count.customDomains,
          bioGalleries: bioCount,
          tags: workspace._count.tags,
          teammates: workspace._count.members,
          links: workspace.linksUsage,
          clicks: workspace.clicksUsage,
          bioLinksPerGallery: bioWithMostLinks?._count.links || 0,
        },
        limits: {
          customDomains: subscriptionResult.subscription?.plan?.maxCustomDomains || 2,
          bioGalleries: subscriptionResult.subscription?.plan?.maxGalleries || 1,
          tags: workspace.maxLinkTags,
          teammates: workspace.maxUsers,
          links: workspace.maxLinksLimit,
          clicks: workspace.maxClicksLimit,
          bioLinksPerGallery: bioWithMostLinks?.maxLinksLimit || subscriptionResult.subscription?.plan?.maxLinksPerBio || 5,
        },
      },
    };
  } catch (error) {
    console.error("Error getting billing data:", error);
    return {
      success: false,
      message: "Failed to get billing data",
      data: null,
    };
  }
}
