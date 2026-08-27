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
  const hasPaidEntitlement = Boolean(
    userEntitlement?.subscription?.id &&
      ["active", "trialing"].includes(subscriptionStatus),
  );

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
