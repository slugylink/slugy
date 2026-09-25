import { polarClient } from "@/lib/polar";
import { db } from "@/server/db";
import { getBillingData } from "@/server/actions/subscription";
import AppPricingComparator from "@/components/app-pricing-comparator";

export const dynamic = "force-dynamic";

type PriceInterval = "month" | "year" | null;

interface TransformedPrice {
  id: string;
  amount: number;
  currency: string;
  interval: PriceInterval;
}

interface TransformedProduct {
  id: string;
  name: string;
  prices: TransformedPrice[];
}

interface PriceData {
  id?: string;
  priceAmount?: number;
  amount?: number;
  price_amount?: number;
  priceCurrency?: string;
  currency?: string;
  price_currency?: string;
  recurringInterval?: PriceInterval;
  recurring_interval?: PriceInterval;
}

interface PolarProduct {
  id?: string;
  name?: string;
  prices?: unknown[];
}

function transformPrice(price: unknown): TransformedPrice {
  const p = price as PriceData;

  const rawAmount = p.priceAmount ?? p.amount ?? p.price_amount ?? 0;
  const rawCurrency =
    p.priceCurrency ?? p.currency ?? p.price_currency ?? "USD";
  const interval = (p.recurringInterval ??
    p.recurring_interval ??
    null) as PriceInterval;

  const amount = typeof rawAmount === "number" ? rawAmount / 100 : 0;
  const currency = typeof rawCurrency === "string" ? rawCurrency : "USD";

  return {
    id: p.id ?? "",
    amount,
    currency,
    interval,
  };
}

async function listPolarProducts(): Promise<PolarProduct[]> {
  try {
    const response = await polarClient.products.list({ isArchived: false });
    const items = response?.result?.items;
    if (Array.isArray(items)) return items as PolarProduct[];

    const collected: PolarProduct[] = [];
    if (
      response &&
      typeof response === "object" &&
      Symbol.asyncIterator in response
    ) {
      for await (const page of response as AsyncIterable<{
        result?: { items?: PolarProduct[] };
      }>) {
        collected.push(...(page.result?.items ?? []));
        break;
      }
    }
    return collected;
  } catch (error) {
    console.error("Failed to list Polar products for upgrade page:", error);
    return [];
  }
}

/** Polar product name → our plan bucket. */
function planTypeFromProductName(
  name?: string,
): "basic" | "pro" | "business" | null {
  const normalized = (name ?? "").toLowerCase().trim();
  if (!normalized) return null;
  if (normalized.includes("business")) return "business";
  if (normalized.includes("basic")) return "basic";
  if (normalized.includes("pro")) return "pro";
  return null;
}

/**
 * Sync each plan's Polar price IDs so webhooks can match incoming events
 * ("Plan not found for price ID"). Matches per product, never mixes tiers.
 */
async function syncPlanPriceIds(products: PolarProduct[]): Promise<void> {
  type Bucket = { monthlyPriceId: string | null; yearlyPriceId: string | null };
  const byPlanType: Partial<Record<"basic" | "pro" | "business", Bucket>> = {};

  for (const product of products) {
    const planType = planTypeFromProductName(product.name);
    if (!planType) continue;

    const bucket: Bucket = byPlanType[planType] ?? {
      monthlyPriceId: null,
      yearlyPriceId: null,
    };

    for (const price of product.prices ?? []) {
      const raw = price as {
        id?: string;
        recurring_interval?: string;
        recurringInterval?: string;
      };
      const id = raw.id ?? "";
      if (!id) continue;
      const interval = (raw.recurringInterval ??
        raw.recurring_interval ??
        "") as string;
      if (interval === "month") bucket.monthlyPriceId = id;
      else if (interval === "year") bucket.yearlyPriceId = id;
      else if (planType === "basic") {
        // One-time "forever" Basic product (non-recurring).
        bucket.monthlyPriceId = bucket.monthlyPriceId ?? id;
        bucket.yearlyPriceId = bucket.yearlyPriceId ?? id;
      } else {
        // Non-recurring paid product → treat as monthly.
        bucket.monthlyPriceId = bucket.monthlyPriceId ?? id;
      }
    }

    byPlanType[planType] = bucket;
  }

  await Promise.all(
    (
      Object.entries(byPlanType) as Array<
        ["basic" | "pro" | "business", Bucket]
      >
    ).map(async ([planType, bucket]) => {
      if (!bucket.monthlyPriceId && !bucket.yearlyPriceId) return;
      const plan = await db.plan.findFirst({ where: { planType } });
      if (!plan) return;
      await db.plan.update({
        where: { id: plan.id },
        data: {
          ...(bucket.monthlyPriceId && {
            monthlyPriceId: bucket.monthlyPriceId,
          }),
          ...(bucket.yearlyPriceId && { yearlyPriceId: bucket.yearlyPriceId }),
        },
      });
    }),
  );
}

export default async function Upgrade({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;

  const [items, billingResult] = await Promise.all([
    listPolarProducts(),
    getBillingData(workspace),
  ]);

  const planType =
    billingResult.success && billingResult.data?.plan?.planType
      ? billingResult.data.plan.planType.toLowerCase()
      : null;
  const hasActiveSubscription =
    billingResult.data?.subscription?.hasActiveSubscription === true;

  const PAID_PLANS = new Set(["pro", "business"]);
  const currentPlanType: "free" | "basic" | "pro" | "business" | null =
    hasActiveSubscription && planType
      ? (planType as "free" | "basic" | "pro" | "business")
      : "free";
  const isPaidPlan = currentPlanType ? PAID_PLANS.has(currentPlanType) : false;

  try {
    await syncPlanPriceIds(items);
  } catch (error) {
    console.error("Failed to sync plan price IDs:", error);
  }

  const productData: TransformedProduct[] = items.map((product) => ({
    id: product.id ?? "",
    name: product.name ?? "",
    prices: (product.prices ?? []).map(transformPrice),
  }));

  return (
    <AppPricingComparator
      products={productData}
      workspace={workspace}
      isPaidPlan={isPaidPlan}
      currentPlanType={currentPlanType}
    />
  );
}
