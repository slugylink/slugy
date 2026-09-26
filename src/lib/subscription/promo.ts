import { PRICING_COPY, PRO_PLAN } from "@/constants/data/price";
import { polarClient } from "@/lib/polar";

let cachedDiscountId: string | null | undefined;

type PromoDiscount = {
  id?: string;
  code?: string | null;
  name?: string | null;
  amount?: number | null;
  currency?: string | null;
  duration?: string | null;
  durationInMonths?: number | null;
  maxRedemptions?: number | null;
  redemptionsCount?: number | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
};

function collectItems(page: unknown): PromoDiscount[] {
  if (!page || typeof page !== "object") return [];
  const result = (page as { result?: { items?: unknown[] } }).result;
  return Array.isArray(result?.items) ? (result.items as PromoDiscount[]) : [];
}

async function listPromoDiscounts(): Promise<PromoDiscount[]> {
  const response = await polarClient.discounts.list({
    query: PRICING_COPY.promoCode,
    limit: 50,
  });

  const items: PromoDiscount[] = [...collectItems(response)];

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
  return items;
}

function findPromoDiscount(items: PromoDiscount[]): PromoDiscount | undefined {
  return items.find(
    (discount) =>
      discount.code?.toUpperCase() === PRICING_COPY.promoCode.toUpperCase(),
  );
}

export async function resolvePromoDiscountId(): Promise<string | undefined> {
  const fromEnv = process.env.POLAR_PROMO_DISCOUNT_ID?.trim();
  if (fromEnv) return fromEnv;

  if (cachedDiscountId !== undefined) {
    return cachedDiscountId ?? undefined;
  }

  try {
    const items = await listPromoDiscounts();
    const match = findPromoDiscount(items);

    cachedDiscountId = match?.id ?? null;
    return match?.id;
  } catch (error) {
    console.error("Failed to resolve GETPRO discount:", error);
    cachedDiscountId = null;
    return undefined;
  }
}

export interface PromoStatus {
  code: string;
  amount: number;
  promoPrice: number;
  currency: string;
  duration: string;
  durationLabel: string;
  isRecurring: boolean;
  redeemed: number;
  maxRedemptions: number | null;
  remaining: number | null;
  percentClaimed: number | null;
  isSoldOut: boolean;
  isActive: boolean;
  cachedAt: string;
}

let cachedStatus: { at: number; data: PromoStatus } | null = null;
const STATUS_TTL_MS = 60 * 1000;

function toPromoStatus(discount: PromoDiscount | undefined): PromoStatus {
  const redeemed = Math.max(0, Number(discount?.redemptionsCount ?? 0) || 0);
  const maxRaw = discount?.maxRedemptions ?? PRICING_COPY.promoMaxRedemptions;
  const maxRedemptions =
    typeof maxRaw === "number" && Number.isFinite(maxRaw) && maxRaw > 0
      ? maxRaw
      : null;
  const remaining =
    maxRedemptions === null ? null : Math.max(0, maxRedemptions - redeemed);
  const percentClaimed =
    maxRedemptions === null
      ? null
      : Math.min(100, Math.round((redeemed / maxRedemptions) * 100));
  // GETPRO is a permanent deal: Pro $8/mo -> $5/mo forever.
  // Polar duration "once" would mean first-cycle-only, which is NOT this promo.
  const rawDuration =
    typeof discount?.duration === "string"
      ? discount.duration.toLowerCase()
      : PRICING_COPY.promoDuration;
  const duration =
    rawDuration === "once" ||
    rawDuration === "forever" ||
    rawDuration === "repeat"
      ? rawDuration
      : "forever";
  const isRecurring = duration !== "once";
  const durationLabel =
    duration === "repeat" && discount?.durationInMonths
      ? `for ${discount.durationInMonths} months`
      : "forever";
  const amount =
    typeof discount?.amount === "number"
      ? discount.amount / 100
      : PRICING_COPY.promoAmount;
  if (duration === "once") {
    console.warn(
      "[Promo] Polar GETPRO duration is 'once' (first cycle only) — copy promises a permanent $5/mo deal. Fix the discount in Polar to forever/repeat.",
    );
  }
  const now = Date.now();
  const endsAt = discount?.endsAt ? new Date(discount.endsAt).getTime() : null;
  const startsAt = discount?.startsAt
    ? new Date(discount.startsAt).getTime()
    : null;
  const withinWindow =
    (startsAt === null || Number.isNaN(startsAt) || now >= startsAt) &&
    (endsAt === null || Number.isNaN(endsAt) || now <= endsAt);
  const isSoldOut = remaining !== null && remaining <= 0;

  return {
    code: discount?.code ?? PRICING_COPY.promoCode,
    amount,
    promoPrice: Math.max(0, PRO_PLAN.monthlyPrice - amount),
    currency: discount?.currency ?? "USD",
    duration,
    durationLabel,
    isRecurring,
    redeemed,
    maxRedemptions,
    remaining,
    percentClaimed,
    isSoldOut,
    isActive: withinWindow && !isSoldOut,
    cachedAt: new Date().toISOString(),
  };
}

/**
 * Live redemption state for the GETPRO discount in Polar.
 * Short in-memory TTL (60s) — the public API route adds Redis + CDN caching
 * on top. Never throws: falls back to code + configured max on Polar errors.
 */
export async function getPromoStatus(): Promise<PromoStatus> {
  if (cachedStatus && Date.now() - cachedStatus.at < STATUS_TTL_MS) {
    return cachedStatus.data;
  }
  try {
    const discountId = process.env.POLAR_PROMO_DISCOUNT_ID?.trim();
    let discount: PromoDiscount | undefined;
    if (discountId) {
      try {
        discount = (await polarClient.discounts.get({
          id: discountId,
        })) as unknown as PromoDiscount;
      } catch {
        discount = undefined;
      }
    }
    if (!discount) {
      const items = await listPromoDiscounts();
      discount = findPromoDiscount(items);
    }
    const status = toPromoStatus(discount);
    cachedStatus = { at: Date.now(), data: status };
    return status;
  } catch (error) {
    console.error("Failed to load GETPRO promo status:", error);
    return toPromoStatus(undefined);
  }
}

/**
 * The GETPRO promo locks Pro monthly at $5/mo ($3 off $8) permanently —
 * it must only apply to the Pro monthly product, never yearly or other tiers.
 * Polar must be configured as forever (or repeat), never once.
 */
export function shouldApplyCheckoutPromo(
  productIds: string[],
  billing?: string | null,
): boolean {
  if (billing !== "monthly") return false;
  if (productIds.length === 0) return false;

  const monthlyProId = PRO_PLAN.monthlyPriceId;
  // If we know the Pro monthly price ID, require it explicitly.
  if (monthlyProId) return productIds.includes(monthlyProId);

  // Otherwise fall back to any monthly checkout (matched by name upstream).
  return true;
}
