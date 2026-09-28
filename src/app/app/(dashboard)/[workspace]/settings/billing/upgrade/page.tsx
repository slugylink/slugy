import { polarClient } from "@/lib/polar";
import { redirect } from "next/navigation";
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

/**
 * Price-ID sync lives in the Polar webhook handlers
 * (syncPlanPriceIdsFromPolar) — never on page render. A side-effecting GET
 * let any visitor trigger DB writes and raced concurrent checkouts.
 */
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

  // Purchase and billing management are owner-only: subscriptions are
  // per-user, so a member buying here would upgrade THEMSELVES while looking
  // at the workspace's plan. Members get read-only billing instead.
  if (
    !billingResult.success ||
    billingResult.data?.access?.canManageBilling !== true
  ) {
    redirect(`/${workspace}/settings/billing`);
  }

  const planType =
    billingResult.success && billingResult.data?.plan?.planType
      ? billingResult.data.plan.planType.toLowerCase()
      : null;
  const hasActiveSubscription =
    billingResult.data?.subscription?.hasActiveSubscription === true;

  const PAID_PLANS = new Set(["pro", "growth"]);
  const currentPlanType: "free" | "basic" | "pro" | "growth" | null =
    hasActiveSubscription && planType
      ? (planType as "free" | "basic" | "pro" | "growth")
      : "free";
  const isPaidPlan = currentPlanType ? PAID_PLANS.has(currentPlanType) : false;

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
