"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ensureFreeSubscription } from "@/lib/subscription/free-entitlement";

export async function createFreeSubscription() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false as const, message: "Unauthorized" };
  }
  const result = await ensureFreeSubscription(userId);
  if (!result.success) {
    return {
      success: false as const,
      message: "Could not activate the Free plan. Please try again.",
    };
  }
  return { success: true as const, message: "Free plan activated" };
}
