import PricingComparator from "@/components/pricing-comparator";
import { polarClient } from "@/lib/polar";
import { db } from "@/server/db";
import { getBillingData } from "@/server/actions/subscription";

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

export default async function Upgrade({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;

  const [response, billingResult] = await Promise.all([
    polarClient.products.list({ isArchived: false }),
    getBillingData(workspace),
  ]);

  const items = response?.result?.items ?? [];

  // Check if user has a paid subscription (not free plan)
  const isPaidPlan =
    billingResult.success && billingResult.data?.plan?.planType
      ? billingResult.data.plan.planType.toLowerCase() !== "free"
      : false;

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
  }

  const productData: TransformedProduct[] = items.map((product) => ({
    id: product.id ?? "",
    name: product.name ?? "",
    prices: (product.prices ?? []).map(transformPrice),
  }));

  return (
    <div>
      <PricingComparator
        products={productData}
        workspace={workspace}
        isPaidPlan={isPaidPlan}
      />
    </div>
  );
}
