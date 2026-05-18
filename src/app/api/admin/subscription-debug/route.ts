import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { polarClient } from "@/lib/polar";
import {
  reconcileSubscriptionIfStale,
  subscriptionWithPlanSelect,
} from "@/lib/subscription/reconcile";
import { db } from "@/server/db";

function isTruthy(value: string | null) {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actor = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, role: true },
    });

    if (!actor || actor.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId")?.trim() || null;
    const email = url.searchParams.get("email")?.trim().toLowerCase() || null;
    const forceSync = isTruthy(url.searchParams.get("forceSync"));

    if (!userId && !email) {
      return NextResponse.json(
        { error: "Provide userId or email query param" },
        { status: 400 },
      );
    }

    const user = await db.user.findFirst({
      where: userId ? { id: userId } : { email: email! },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        customerId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const localSubscription = await db.subscription.findUnique({
      where: { referenceId: user.id },
      select: subscriptionWithPlanSelect,
    });

    const now = new Date();
    const remoteAttempted =
      localSubscription?.provider === "polar" &&
      Boolean(localSubscription.subscriptionId);

    let remoteSubscription: {
      id: string;
      status: string;
      currentPeriodStart: string;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
      customerId: string;
      recurringInterval: string;
      priceIds: string[];
    } | null = null;
    let remoteError: string | null = null;

    if (remoteAttempted && localSubscription?.subscriptionId) {
      try {
        const remote = await polarClient.subscriptions.get({
          id: localSubscription.subscriptionId,
        });
        remoteSubscription = {
          id: remote.id,
          status: remote.status,
          currentPeriodStart: remote.currentPeriodStart.toISOString(),
          currentPeriodEnd: remote.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: remote.cancelAtPeriodEnd,
          customerId: remote.customerId,
          recurringInterval: remote.recurringInterval,
          priceIds: remote.prices.map((price) => price.id).filter(Boolean),
        };
      } catch (error) {
        remoteError = error instanceof Error ? error.message : "Unknown error";
      }
    }

    const staleByDate = localSubscription
      ? localSubscription.periodEnd <= now
      : false;
    const eligibleForPolarRefresh = Boolean(
      localSubscription &&
        localSubscription.provider === "polar" &&
        localSubscription.plan.planType === "pro" &&
        localSubscription.subscriptionId &&
        staleByDate,
    );

    const syncResult = forceSync
      ? await reconcileSubscriptionIfStale(localSubscription)
      : localSubscription;

    return NextResponse.json({
      timestamp: now.toISOString(),
      actor: {
        id: actor.id,
        email: actor.email,
        role: actor.role,
      },
      targetUser: user,
      diagnostics: {
        forceSyncRequested: forceSync,
        hasLocalSubscription: Boolean(localSubscription),
        eligibleForPolarRefresh,
        staleByDate,
        hasPolarSubscriptionId: Boolean(localSubscription?.subscriptionId),
        provider: localSubscription?.provider ?? null,
        localStatus: localSubscription?.status ?? null,
        localPeriodStart: localSubscription?.periodStart.toISOString() ?? null,
        localPeriodEnd: localSubscription?.periodEnd.toISOString() ?? null,
        localPlanType: localSubscription?.plan.planType ?? null,
        localPlanName: localSubscription?.plan.name ?? null,
        remoteAttempted,
        remoteError,
      },
      localSubscription,
      remoteSubscription,
      postSyncSubscription:
        forceSync && syncResult
          ? {
              status: syncResult.status,
              periodStart: syncResult.periodStart.toISOString(),
              periodEnd: syncResult.periodEnd.toISOString(),
              cancelAtPeriodEnd: syncResult.cancelAtPeriodEnd,
              provider: syncResult.provider,
              subscriptionId: syncResult.subscriptionId,
              planType: syncResult.plan.planType,
            }
          : null,
    });
  } catch (error) {
    console.error("[Admin Subscription Debug] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to inspect subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
