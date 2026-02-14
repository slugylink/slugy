"use server";
import { db } from "@/server/db";
import { PlanType } from "@prisma/client";
import { revalidateTag } from "next/cache";

/**
 * Syncs workspace and bio gallery limits based on user's subscription plan
 * Called when subscription is created, upgraded, or downgraded
 */
export async function syncUserLimits(userId: string, planType: PlanType) {
  try {
    // Get the plan details from database
    const plan = await db.plan.findFirst({
      where: { planType },
      select: {
        maxWorkspaces: true,
        maxLinksPerWorkspace: true,
        maxClicksPerWorkspace: true,
        maxUsers: true,
        maxCustomDomains: true,
        maxGalleries: true,
        maxLinksPerBio: true,
        maxTagsPerWorkspace: true,
      },
    });

    if (!plan) {
      console.error(`[Limits Sync] Plan not found for planType: ${planType}`);
      return { success: false, message: "Plan not found" };
    }

    // Update all workspaces for this user with new limits
    await db.workspace.updateMany({
      where: { userId },
      data: {
        maxLinksLimit: plan.maxLinksPerWorkspace,
        maxClicksLimit: plan.maxClicksPerWorkspace,
        maxUsers: plan.maxUsers,
        maxLinkTags: plan.maxTagsPerWorkspace,
      },
    });

    // Update all bio galleries for this user with new limits
    await db.bio.updateMany({
      where: { userId },
      data: {
        maxLinksLimit: plan.maxLinksPerBio,
        maxClicksLimit: plan.maxClicksPerWorkspace, // Bio clicks use workspace limit
      },
    });

    return { success: true, message: "Limits synced successfully" };
  } catch (error) {
    console.error(
      `[Limits Sync] Error syncing limits for user ${userId}:`,
      error,
    );
    return { success: false, message: "Failed to sync limits" };
  }
}

/**
 * Revalidates all subscription-related caches
 */
export async function revalidateSubscriptionCache() {
  try {
    await Promise.all([
      revalidateTag("subscription", "max"),
      revalidateTag("workspace", "max"),
      revalidateTag("all-workspaces", "max"),
      revalidateTag("dbuser", "max"),
      revalidateTag("bio", "max"),
    ]);
    return { success: true };
  } catch (error) {
    console.error("[Limits Sync] Error revalidating cache:", error);
    return { success: false };
  }
}

/**
 * Gets default free plan limits
 */
export async function getFreePlanLimits() {
  const freePlan = await db.plan.findFirst({
    where: { planType: "free" },
    select: {
      maxWorkspaces: true,
      maxLinksPerWorkspace: true,
      maxClicksPerWorkspace: true,
      maxUsers: true,
      maxCustomDomains: true,
      maxGalleries: true,
      maxLinksPerBio: true,
      maxTagsPerWorkspace: true,
    },
  });

  return (
    freePlan || {
      maxWorkspaces: 2,
      maxLinksPerWorkspace: 20,
      maxClicksPerWorkspace: 500,
      maxUsers: 1,
      maxCustomDomains: 2,
      maxGalleries: 1,
      maxLinksPerBio: 5,
      maxTagsPerWorkspace: 5,
    }
  );
}
