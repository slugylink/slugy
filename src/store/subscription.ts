import { create } from "zustand";

type PlanType = "basic" | "pro" | string;

interface SubscriptionPlan {
  id?: string;
  name?: string | null;
  planType?: PlanType | null;
}

interface ActiveSubscription {
  id?: string;
  priceId?: string | null;
  customerId?: string | null;
  provider?: string | null;
  status?: string;
  periodStart?: string | Date;
  periodEnd?: string | Date;
  plan?: SubscriptionPlan | null;
}

interface SubscriptionStoreState {
  subscription: ActiveSubscription | null;
  planType: PlanType | null;
  isPro: boolean;
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
  fetchSubscription: () => Promise<void>;
  resetSubscription: () => void;
}

function applySubscription(
  set: (partial: Partial<SubscriptionStoreState>) => void,
  subscription: ActiveSubscription | null,
) {
  const planType =
    (subscription?.plan?.planType as PlanType | undefined) ?? null;
  const isPro = !!planType && planType.toString().toLowerCase() === "pro";

  set({
    subscription,
    planType,
    isPro,
    hasFetched: true,
    isLoading: false,
    error: null,
  });
}

export const useSubscriptionStore = create<SubscriptionStoreState>(
  (set, get) => ({
    subscription: null,
    planType: null,
    isPro: false,
    isLoading: false,
    error: null,
    hasFetched: false,

    resetSubscription() {
      set({
        subscription: null,
        planType: null,
        isPro: false,
        isLoading: false,
        error: null,
        hasFetched: false,
      });
    },

    async fetchSubscription() {
      const { hasFetched, isLoading } = get();
      if (hasFetched || isLoading) return;

      set({ isLoading: true, error: null });

      try {
        const checkoutId =
          typeof window === "undefined"
            ? null
            : new URLSearchParams(window.location.search).get("checkoutId");
        const subscriptionUrl = checkoutId
          ? `/api/subscription/active?checkoutId=${encodeURIComponent(checkoutId)}`
          : "/api/subscription/active";

        const res = await fetch(subscriptionUrl, {
          credentials: "include",
          cache: "no-store",
        });

        if (res.status === 304) {
          const retry = await fetch(subscriptionUrl, {
            credentials: "include",
            cache: "reload",
            headers: { "Cache-Control": "no-cache" },
          });
          if (!retry.ok) {
            throw new Error("Failed to load subscription");
          }
          const retryData = (await retry.json()) as {
            subscription?: ActiveSubscription | null;
          };
          applySubscription(set, retryData.subscription ?? null);
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to load subscription");
        }

        const data = (await res.json()) as {
          subscription?: ActiveSubscription | null;
        };

        applySubscription(set, data.subscription ?? null);
      } catch {
        // Do not default to "basic": the upgrade popup treats that as unpaid.
        set({
          subscription: null,
          planType: null,
          isPro: false,
          hasFetched: true,
          isLoading: false,
          error: "Failed to load subscription",
        });
      }
    },
  }),
);
