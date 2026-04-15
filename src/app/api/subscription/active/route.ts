import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getActiveSubscription } from "@/server/actions/subscription";
import { jsonWithETag } from "@/lib/http";
import { db } from "@/server/db";
import { polarClient } from "@/lib/polar";
import { activateBasicEntitlement } from "@/lib/subscription/basic-entitlement";

function getMetadataUserId(metadata?: Record<string, unknown> | null) {
  const userId = metadata?.userId;
  return typeof userId === "string" ? userId : null;
}

function getPlanTypeFromProductName(name?: string | null) {
  const normalized = (name ?? "").toLowerCase().trim();
  if (!normalized) return null;
  if (normalized.includes("basic")) return "basic";
  if (normalized.includes("pro")) return "pro";
  return null;
}

async function isBasicCheckoutProduct(checkout: {
  product?: { name?: string | null } | null;
  productPriceId?: string | null;
}) {
  if (getPlanTypeFromProductName(checkout.product?.name) === "basic") {
    return true;
  }

  if (!checkout.productPriceId) return false;

  const basicPlan = await db.plan.findFirst({
    where: { planType: "basic" },
    select: { monthlyPriceId: true, yearlyPriceId: true },
  });

  return (
    basicPlan?.monthlyPriceId === checkout.productPriceId ||
    basicPlan?.yearlyPriceId === checkout.productPriceId
  );
}

async function recoverBasicCheckoutEntitlement(req: Request, userId: string) {
  const checkoutId = new URL(req.url).searchParams.get("checkoutId")?.trim();
  if (!checkoutId) return null;

  try {
    const checkout = await polarClient.checkouts.get({ id: checkoutId });
    const checkoutUserId =
      getMetadataUserId(checkout.metadata) ?? checkout.customerExternalId;
    const completed = ["confirmed", "succeeded"].includes(checkout.status);

    if (
      checkoutUserId !== userId ||
      !completed ||
      !(await isBasicCheckoutProduct(checkout))
    ) {
      return null;
    }

    return activateBasicEntitlement({
      userId,
      customerId: checkout.customerId,
      priceId: checkout.productPriceId,
    });
  } catch (error) {
    console.error("Error recovering Basic checkout entitlement:", error);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return jsonWithETag(
        req,
        {
          msg: "Unauthorized",
          status: false,
          subscription: null,
        },
        { status: 401 },
      );
    }

    const recoveredSubscription = await recoverBasicCheckoutEntitlement(
      req,
      session.user.id,
    );
    const result = recoveredSubscription
      ? {
          msg: "Success",
          status: true,
          subscription: recoveredSubscription,
        }
      : await getActiveSubscription(session.user.id);

    // Always return 200 for easier client handling; use `status` flag in body.
    return jsonWithETag(req, result, { status: 200 });
  } catch (error) {
    console.error("Error fetching active subscription:", error);
    return jsonWithETag(
      req,
      {
        msg: "Failed to fetch subscription",
        status: false,
        subscription: null,
      },
      { status: 500 },
    );
  }
}
