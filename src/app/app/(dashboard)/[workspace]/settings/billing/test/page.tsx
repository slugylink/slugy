"use client";

import Link from "next/link";

export default function TestPage() {
  // Get checkout URL with product ID based on billing period
  const getCheckoutUrl = (billingPeriod: "monthly") => {
    const baseUrl = "/api/subscription/checkout";

    // Use environment variables (they should be NEXT_PUBLIC_ for client access)
    const monthlyProductId = "decc50b9-ca4c-4453-b383-65a7e28ca430";
    // Polar expects "products" parameter (plural)
    if (billingPeriod === "monthly" && monthlyProductId) {
      return `${baseUrl}?products=${monthlyProductId}`;
    }

    // Fallback: return base URL (will show error but user can add params manually)
    return baseUrl;
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Polar Checkout Test</h1>
        <div className="flex gap-4">
          <Link
            href={getCheckoutUrl("monthly")}
            className="rounded border px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Test Monthly Checkout
          </Link>
        </div>
      </div>
    </main>
  );
}
