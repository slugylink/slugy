"use server";
import * as queries from "@/lib/subscription/queries";
import { requireSelf } from "@/lib/require-self";
import { db } from "@/server/db";
import { getWorkspaceAccess } from "@/lib/workspace-access";
import { PRICING_COPY } from "@/constants/data/price";
import { shouldApplyCheckoutPromo } from "@/lib/subscription/promo";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { syncUserLimits } from "@/lib/subscription/limits-sync";
import { isLifetimeBillingPeriod } from "@/lib/subscription/reconcile";

export async function getActiveSubscription(userId: string) {
  await requireSelf(userId);
  return queries.getActiveSubscription(userId);
}
export async function getSubscriptionWithPlan(userId: string) {
  await requireSelf(userId);
  return queries.getSubscriptionWithPlan(userId);
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

    // Owner OR member access — billing is workspace-scoped, not owner-only.
    // Members previously got "Workspace not found" → billing redirect loop.
    const access = await getWorkspaceAccess(userId, workspaceSlug);
    if (!access.success || !access.workspace) {
      return {
        success: false,
        message: "Workspace not found",
        data: null,
      };
    }

    // Get workspace with counts
    const workspace = await db.workspace.findUnique({
      where: { id: access.workspace.id },
      select: {
        id: true,
        name: true,
        slug: true,
        userId: true,
        maxLinksLimit: true,
        maxClicksLimit: true,
        maxUsers: true,
        maxLinkTags: true,
        maxUtmTemplates: true,
        linksUsage: true,
        clicksUsage: true,
        addedUsers: true,
        _count: {
          select: {
            customDomains: true,
            tags: true,
            utmTemplates: true,
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

    // Billing is OWNER-scoped: caps, cycle and portal all belong to the
    // workspace owner's subscription. Showing the viewer's own plan here
    // made members buy Pro for themselves thinking it upgraded the space.
    const ownerId = workspace.userId;
    const viewerRole = access.role;
    const isOwner = viewerRole === "owner";

    const [subscriptionResult, user, bioCount, bioWithMostLinks] =
      await Promise.all([
        queries.getSubscriptionWithPlan(ownerId),
        db.user.findUnique({
          where: { id: ownerId },
          select: { customerId: true },
        }),
        db.bio.count({
          where: { userId: ownerId },
        }),
        db.bio.findFirst({
          where: { userId: ownerId },
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
        workspace.maxUtmTemplates !== plan.maxUtmTemplates ||
        (bioWithMostLinks?.maxLinksLimit ?? 5) !== plan.maxLinksPerBio)
    ) {
      await syncUserLimits(ownerId, plan.planType);
    }

    // Format billing cycle dates
    const periodStart = subscriptionResult.subscription?.periodStart;
    const periodEnd = subscriptionResult.subscription?.periodEnd;
    const planType = subscriptionResult.subscription?.plan?.planType;
    const isLifetimeAccess = isLifetimeBillingPeriod(
      planType,
      periodStart,
      periodEnd,
    );
    const hasActiveSubscription = Boolean(subscriptionResult.subscription?.id);
    const hasCustomerId = Boolean(
      subscriptionResult.subscription?.customerId || user?.customerId,
    );
    const isPolarSubscription =
      subscriptionResult.subscription?.provider === "polar";
    // Only the workspace OWNER can manage or purchase billing — the portal
    // session and checkout both belong to the viewer, so showing them to
    // members would bill the wrong tenant.
    const canManagePortal =
      isOwner && hasActiveSubscription && hasCustomerId && isPolarSubscription;

    return {
      success: true,
      message: "Billing data retrieved",
      data: {
        plan: subscriptionResult.subscription?.plan || {
          name: "Free",
          planType: "free",
          maxWorkspaces: 1,
          maxLinksPerWorkspace: 10,
          maxClicksPerWorkspace: 1000,
          maxUsers: 1,
          maxCustomDomains: 1,
          maxGalleries: 1,
          maxLinksPerBio: 5,
          maxTagsPerWorkspace: 5,
          maxUtmTemplates: 5,
        },
        billingCycle: {
          start: periodStart
            ? periodStart.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : null,
          end: periodEnd
            ? periodEnd.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : null,
          isLifetime: isLifetimeAccess,
        },
        subscription: {
          cancelAtPeriodEnd:
            subscriptionResult.subscription?.cancelAtPeriodEnd || false,
          canceledAt: subscriptionResult.subscription?.canceledAt,
          hasActiveSubscription,
          canManagePortal,
        },
        access: {
          role: viewerRole,
          isOwner,
          // Purchase/manage CTAs render for the owner only.
          canManageBilling: isOwner,
        },
        usage: {
          customDomains: workspace._count.customDomains,
          bioGalleries: bioCount,
          tags: workspace._count.tags,
          utmTemplates: workspace._count.utmTemplates,
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
          utmTemplates:
            subscriptionResult.subscription?.plan?.maxUtmTemplates ??
            workspace.maxUtmTemplates,
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

    // Combine into ONE comma-separated "products" value. The checkout route
    // splits on commas and appends each as its own ?products= param for the
    // Polar SDK. Two sequential .set("products", …) calls would overwrite.
    const productIds = [productId?.trim(), priceId?.trim()].filter(
      (id): id is string => Boolean(id),
    );
    // De-dupe while preserving order.
    const uniqueProductIds = [...new Set(productIds)];

    if (uniqueProductIds.length > 0) {
      checkoutUrl.searchParams.set("products", uniqueProductIds.join(","));
    }

    const checkoutProductIds = uniqueProductIds;
    if (shouldApplyCheckoutPromo(checkoutProductIds)) {
      checkoutUrl.searchParams.set("discount_code", PRICING_COPY.promoCode);
      checkoutUrl.searchParams.set("billing", "monthly");
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
