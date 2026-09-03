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

interface PolarProduct {
  id?: string;
  name?: string;
  prices?: unknown[];
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
  const currentPlanType =
    hasActiveSubscription && (planType === "basic" || planType === "pro")
      ? planType
      : null;
  const isPaidPlan = currentPlanType === "pro";

  // Sync Pro plan price IDs from Polar so webhooks can match (Plan not found for price ID)
  let monthlyPriceId: string | null = null;
  let yearlyPriceId: string | null = null;
  for (const product of items) {
    for (const price of product.prices ?? []) {
      const raw = price as {
        id?: string;
        recurring_interval?: string;
        recurringInterval?: string;
      };
      const id = raw.id ?? "";
      const interval = (raw.recurringInterval ??
        raw.recurring_interval ??
        "") as string;
      if (!id) continue;
      if (interval === "month") monthlyPriceId = id;
      if (interval === "year") yearlyPriceId = id;
    }
  }
  if (monthlyPriceId || yearlyPriceId) {
    try {
      const pro = await db.plan.findFirst({ where: { planType: "pro" } });
      if (pro) {
        await db.plan.update({
          where: { id: pro.id },
          data: {
            ...(monthlyPriceId && { monthlyPriceId }),
            ...(yearlyPriceId && { yearlyPriceId }),
          },
        });
      }
    } catch (error) {
      console.error("Failed to sync Pro price IDs:", error);
    }
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
