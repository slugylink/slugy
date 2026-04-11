import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { polarClient } from "@/lib/polar";
import AppPricingComparator from "@/components/app-pricing-comparator";
import { db } from "@/server/db";

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

  return {
    id: p.id ?? "",
    amount: typeof rawAmount === "number" ? rawAmount / 100 : 0,
    currency: typeof rawCurrency === "string" ? rawCurrency : "USD",
    interval,
  };
}

export default async function OnboardingPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { workspace } = await searchParams;
  if (!workspace?.trim()) {
    redirect("/onboarding/create-workspace");
  }

  const userEntitlement = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      customerId: true,
      subscription: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  const subscriptionStatus =
    userEntitlement?.subscription?.status?.toLowerCase() ?? "";
  const hasSubscriptionRecord = Boolean(
    userEntitlement?.subscription?.id &&
      !["inactive", "cancelled", "canceled", "revoked"].includes(
        subscriptionStatus,
      ),
  );

  let hasPaidEntitlement = hasSubscriptionRecord;

  // Recovery path for one-time Basic checkouts where customer exists but
  // webhook subscription row was not created yet.
  if (!hasPaidEntitlement && userEntitlement?.customerId) {
    const basicPlan = await db.plan.findFirst({
      where: { planType: "basic" },
      select: { id: true, monthlyPriceId: true },
    });

    if (basicPlan?.id) {
      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setFullYear(periodEnd.getFullYear() + 100);

      await db.subscription.upsert({
        where: { referenceId: session.user.id },
        create: {
          referenceId: session.user.id,
          planId: basicPlan.id,
          customerId: userEntitlement.customerId,
          priceId: basicPlan.monthlyPriceId ?? undefined,
          status: "active",
          provider: "polar",
          periodStart,
          periodEnd,
          billingInterval: "month",
        },
        update: {
          planId: basicPlan.id,
          customerId: userEntitlement.customerId,
          priceId: basicPlan.monthlyPriceId ?? undefined,
          status: "active",
          provider: "polar",
          periodStart,
          periodEnd,
          billingInterval: "month",
        },
      });

      hasPaidEntitlement = true;
    }
  }

  if (hasPaidEntitlement) {
    redirect(`/${workspace}`);
  }

  const response = await polarClient.products.list({ isArchived: false });
  const items = response?.result?.items ?? [];

  const productData: TransformedProduct[] = items.map((product) => ({
    id: product.id ?? "",
    name: product.name ?? "",
    prices: (product.prices ?? []).map(transformPrice),
  }));

  return (
    <div className="px-4 py-10 sm:px-8">
      <div className="mx-auto mt-6 mb-8 max-w-3xl text-center">
        <h1 className="text-2xl font-semibold sm:text-2xl">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Pick Basic or Pro to activate your workspace.
        </p>
      </div>
      <div className="mx-auto max-w-5xl bg-white">
        <AppPricingComparator
          products={productData}
          workspace={workspace}
          isPaidPlan={false}
          successUrlPath={`/${workspace}`}
        />
      </div>
    </div>
  );
}
