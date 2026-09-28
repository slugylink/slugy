import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { polarClient } from "@/lib/polar";
import AppPricingComparator from "@/components/app-pricing-comparator";
import ContinueFreeButton from "./continue-free-button";
import { db } from "@/server/db";
import { reconcileUserEntitlement } from "@/lib/subscription/reconcile";
import { validateWorkspaceSlug } from "@/server/actions/workspace/workspace";
import { PRO_PLAN } from "@/constants/data/price";

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
  const workspaceSlug = workspace?.trim();
  if (!workspaceSlug) {
    redirect("/onboarding/create-workspace");
  }

  // The ?workspace= value is user input — verify membership before rendering
  // billing UI for it. Strangers bounce to "/" which resolves correctly.
  const membership = await validateWorkspaceSlug(
    session.user.id,
    workspaceSlug,
  );
  if (!membership.success || !membership.workspace) {
    redirect("/");
  }

  // Enforce step order: welcome (intendedUse) → create-workspace → plans.
  // Deep-links that skip welcome land back at step 1 instead of leaving
  // intendedUse=null forever.
  const onboardingUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { intendedUse: true },
  });
  if (!onboardingUser?.intendedUse) {
    redirect("/onboarding/welcome");
  }

  // Heal a missed checkout webhook before deciding whether to ask for payment.
  await reconcileUserEntitlement(session.user.id);

  const userEntitlement = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      subscription: {
        select: {
          id: true,
          status: true,
          plan: { select: { planType: true } },
        },
      },
    },
  });

  const subscriptionStatus =
    userEntitlement?.subscription?.status?.toLowerCase() ?? "";
  const planType = userEntitlement?.subscription?.plan?.planType?.toLowerCase();
  // Only a *paid* entitlement skips the plans page — a Free entitlement
  // (auto-provisioned) must still let the user choose Pro. Legacy lifetime
  // Basic counts as paid so those users are never asked to pay again.
  const hasPaidEntitlement = Boolean(
    userEntitlement?.subscription?.id &&
      ["active", "trialing"].includes(subscriptionStatus) &&
      (planType === "pro" || planType === "growth" || planType === "basic"),
  );

  if (hasPaidEntitlement) {
    redirect(`/${workspaceSlug}`);
  }

  // Polar outage must not brick onboarding — fall back to code constants so
  // pricing still renders and Free continues to work.
  let productData: TransformedProduct[];
  let productsFromFallback = false;
  try {
    const response = await polarClient.products.list({ isArchived: false });
    const items = response?.result?.items ?? [];
    if (items.length === 0) throw new Error("Empty Polar product list");
    productData = items.map((product) => ({
      id: product.id ?? "",
      name: product.name ?? "",
      prices: (product.prices ?? []).map(transformPrice),
    }));
  } catch (error) {
    console.error("[Onboarding Plans] Polar products.list failed:", error);
    productsFromFallback = true;
    productData = [
      {
        id: PRO_PLAN.monthlyPriceId || "pro-monthly",
        name: "Pro",
        prices: [
          {
            id: PRO_PLAN.monthlyPriceId || "pro-monthly",
            amount: PRO_PLAN.monthlyPrice,
            currency: PRO_PLAN.currency,
            interval: "month",
          },
          {
            id: PRO_PLAN.yearlyPriceId || "pro-yearly",
            amount: PRO_PLAN.yearlyPrice,
            currency: PRO_PLAN.currency,
            interval: "year",
          },
        ],
      },
    ];
  }

  return (
    <div className="px-4 py-10 sm:px-8">
      <div className="mx-auto mt-6 mb-8 max-w-3xl text-center">
        <h1 className="text-2xl font-semibold sm:text-2xl">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Start free, or pick Pro for advanced features.
        </p>
        {productsFromFallback && (
          <p className="text-muted-foreground mt-2 text-xs">
            Live pricing is temporarily unavailable — shown prices may be stale.
            You can still continue with Free.
          </p>
        )}
      </div>
      <div className="mx-auto max-w-5xl bg-white">
        <AppPricingComparator
          products={productData}
          workspace={workspaceSlug}
          isPaidPlan={false}
          successUrlPath={`/${workspaceSlug}`}
        />
        <div className="mx-auto mt-6 max-w-xs">
          <ContinueFreeButton workspace={workspaceSlug} />
          <p className="text-muted-foreground mt-2 text-center text-xs">
            Free forever · 1 workspace · 10 links · 1k clicks/month
          </p>
        </div>
      </div>
    </div>
  );
}
