import PricingComparator from "@/components/pricing-comparator";
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: (process.env.POLAR_MODE as "sandbox" | "production") || "sandbox",
});

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
  const rawCurrency = p.priceCurrency ?? p.currency ?? p.price_currency ?? "USD";
  const interval = (p.recurringInterval ?? p.recurring_interval ?? null) as PriceInterval;

  const amount = typeof rawAmount === "number" ? rawAmount / 100 : 0;
  const currency = typeof rawCurrency === "string" ? rawCurrency : "USD";

  return {
    id: p.id ?? "",
    amount,
    currency,
    interval,
  };
}

export default async function Upgrade() {
  const response = await polar.products.list({ isArchived: false });
  const items = response?.result?.items ?? [];

  const productData: TransformedProduct[] = items.map((product) => ({
    id: product.id ?? "",
    name: product.name ?? "",
    prices: (product.prices ?? []).map(transformPrice),
  }));

  return (
    <div>
      <PricingComparator products={productData} />
    </div>
  );
}
