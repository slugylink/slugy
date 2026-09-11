import { BASIC_PLAN, PRICING_COPY, PRO_PLAN } from "@/constants/data/price";
import { polarClient } from "@/lib/polar";

let cachedDiscountId: string | null | undefined;

function collectItems(page: unknown): { id?: string; code?: string | null }[] {
  if (!page || typeof page !== "object") return [];
  const result = (page as { result?: { items?: unknown[] } }).result;
  return Array.isArray(result?.items)
    ? (result.items as { id?: string; code?: string | null }[])
    : [];
}

export async function resolvePromoDiscountId(): Promise<string | undefined> {
  const fromEnv = process.env.POLAR_PROMO_DISCOUNT_ID?.trim();
  if (fromEnv) return fromEnv;

  if (cachedDiscountId !== undefined) {
    return cachedDiscountId ?? undefined;
  }

  try {
    const response = await polarClient.discounts.list({
      query: PRICING_COPY.promoCode,
      limit: 50,
    });

    const items: { id?: string; code?: string | null }[] = [
      ...collectItems(response),
    ];

    if (
      items.length === 0 &&
      response &&
      typeof response === "object" &&
      Symbol.asyncIterator in response
    ) {
      for await (const page of response as AsyncIterable<unknown>) {
        items.push(...collectItems(page));
      }
    }

    const match = items.find(
      (discount) =>
        discount.code?.toUpperCase() === PRICING_COPY.promoCode.toUpperCase(),
    );

    cachedDiscountId = match?.id ?? null;
    return match?.id;
  } catch (error) {
    console.error("Failed to resolve GETPRO discount:", error);
    cachedDiscountId = null;
    return undefined;
  }
}

export function shouldApplyCheckoutPromo(
  productIds: string[],
  billing?: string | null,
): boolean {
  if (billing === "yearly") return false;

  const basicIds = new Set(
    [BASIC_PLAN.monthlyPriceId, BASIC_PLAN.yearlyPriceId].filter(Boolean),
  );
  const monthlyProId = PRO_PLAN.monthlyPriceId;
  const yearlyProId = PRO_PLAN.yearlyPriceId;

  if (productIds.length > 0 && productIds.every((id) => basicIds.has(id))) {
    return false;
  }

  if (
    yearlyProId &&
    productIds.includes(yearlyProId) &&
    (!monthlyProId || !productIds.includes(monthlyProId))
  ) {
    return false;
  }

  if (billing === "monthly") return productIds.length > 0;
  return Boolean(monthlyProId && productIds.includes(monthlyProId));
}
