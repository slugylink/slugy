"use server";
import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { syncUserLimits } from "@/lib/subscription/limits-sync";

export async function getActiveSubscription(userId: string) {
  try {
    const subscription = await db.subscription.findUnique({
      where: { referenceId: userId },
      select: {
        id: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        cancelAtPeriodEnd: true,
        canceledAt: true,
        plan: {
          select: {
            id: true,
            name: true,
            planType: true,
          },
        },
      },
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
      select: {
        id: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        cancelAtPeriodEnd: true,
        canceledAt: true,
        billingInterval: true,
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

    const [subscriptionResult, bioCount, bioWithMostLinks] = await Promise.all([
      getSubscriptionWithPlan(userId),
      db.bio.count({
        where: { userId },
      }),
      db.bio.findFirst({
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
      }),
    ]);
    const plan = subscriptionResult.subscription?.plan;

    // If user has a plan and workspace/bio limits don't match plan, sync (fixes Pro limits after seed update)
    if (
      plan?.planType &&
      (workspace.maxLinkTags !== plan.maxTagsPerWorkspace ||
        (bioWithMostLinks?.maxLinksLimit ?? 5) !== plan.maxLinksPerBio)
    ) {
      await syncUserLimits(userId, plan.planType);
    }

    // Format billing cycle dates
    const periodStart =
      subscriptionResult.subscription?.periodStart || new Date();
    const periodEnd = subscriptionResult.subscription?.periodEnd || new Date();

    return {
      success: true,
      message: "Billing data retrieved",
      data: {
        plan: subscriptionResult.subscription?.plan || {
          name: "Free",
          planType: "free",
          maxWorkspaces: 2,
          maxLinksPerWorkspace: 20,
          maxClicksPerWorkspace: 500,
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
        subscription: {
          cancelAtPeriodEnd:
            subscriptionResult.subscription?.cancelAtPeriodEnd || false,
          canceledAt: subscriptionResult.subscription?.canceledAt,
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
          customDomains:
            subscriptionResult.subscription?.plan?.maxCustomDomains ?? 2,
          bioGalleries:
            subscriptionResult.subscription?.plan?.maxGalleries ?? 1,
          tags:
            subscriptionResult.subscription?.plan?.maxTagsPerWorkspace ??
            workspace.maxLinkTags,
          teammates:
            subscriptionResult.subscription?.plan?.maxUsers ??
            workspace.maxUsers,
          links:
            subscriptionResult.subscription?.plan?.maxLinksPerWorkspace ??
            workspace.maxLinksLimit,
          clicks:
            subscriptionResult.subscription?.plan?.maxClicksPerWorkspace ??
            workspace.maxClicksLimit,
          bioLinksPerGallery:
            subscriptionResult.subscription?.plan?.maxLinksPerBio ??
            bioWithMostLinks?.maxLinksLimit ??
            5,
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

// Get checkout URL for subscription
export async function getCheckoutUrl(productId?: string, priceId?: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        success: false,
        message: "Unauthorized",
        url: null,
      };
    }

    // Build checkout URL with optional product/price parameters
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_APP_URL || "https://app.slugy.co"
        : "http://app.localhost:3000";

    const checkoutUrl = new URL(`${baseUrl}/api/subscription/checkout`);

    if (productId) {
      checkoutUrl.searchParams.set("product_id", productId);
    }
    if (priceId) {
      checkoutUrl.searchParams.set("price_id", priceId);
    }

    return {
      success: true,
      message: "Checkout URL generated",
      url: checkoutUrl.toString(),
    };
  } catch (error) {
    console.error("Error getting checkout URL:", error);
    return {
      success: false,
      message: "Failed to get checkout URL",
      url: null,
    };
  }
}

// Get customer portal URL for subscription management
export async function getCustomerPortalUrl() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        success: false,
        message: "Unauthorized",
        url: null,
      };
    }

    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_APP_URL || "https://app.slugy.co"
        : "http://app.localhost:3000";

    const portalUrl = `${baseUrl}/api/subscription/manage`;

    return {
      success: true,
      message: "Customer portal URL generated",
      url: portalUrl,
    };
  } catch (error) {
    console.error("Error getting customer portal URL:", error);
    return {
      success: false,
      message: "Failed to get customer portal URL",
      url: null,
    };
  }
}

// Sync subscription from Polar
export async function syncSubscriptionFromPolar() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    const userId = session.user.id;

    // Get user with customer ID and subscription
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { customerId: true },
    });

    if (!user?.customerId) {
      return {
        success: false,
        message: "No customer ID found. Please complete checkout first.",
      };
    }

    // Get current subscription from database
    const existingSubscription = await db.subscription.findUnique({
      where: { referenceId: userId },
      include: { plan: true },
    });

    if (!existingSubscription) {
      return {
        success: false,
        message: "No subscription found. Please complete checkout first.",
      };
    }

    return {
      success: true,
      message: "Subscription data retrieved. Check logs for details.",
      data: {
        periodStart: existingSubscription.periodStart,
        periodEnd: existingSubscription.periodEnd,
        status: existingSubscription.status,
        plan: existingSubscription.plan.name,
      },
    };
  } catch (error) {
    console.error("Error syncing subscription from Polar:", error);
    return {
      success: false,
      message: "Failed to sync subscription",
    };
  }
}
