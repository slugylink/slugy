import { create } from "zustand";

type PlanType = "free" | "pro" | string;

interface SubscriptionPlan {
  id?: string;
  name?: string | null;
  planType?: PlanType | null;
}

interface ActiveSubscription {
  id?: string;
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
}

export const useSubscriptionStore = create<SubscriptionStoreState>(
  (set, get) => ({
    subscription: null,
    planType: null,
    isPro: false,
    isLoading: false,
    error: null,
    hasFetched: false,

    async fetchSubscription() {
      const { hasFetched, isLoading } = get();
      if (hasFetched || isLoading) return;

      set({ isLoading: true, error: null });

      try {
        const res = await fetch("/api/subscription/active", {
          credentials: "include",
        });

        if (!res.ok) {
          let message = "Failed to load subscription";
          try {
            const data = (await res.json()) as {
              msg?: string;
              message?: string;
            };
            message = data.msg || data.message || message;
          } catch {
            // ignore JSON parse errors
          }

          set({
            subscription: null,
            planType: "free",
            isPro: false,
            hasFetched: true,
            isLoading: false,
            error: message,
          });
          return;
        }

        const data = (await res.json()) as {
          subscription?: ActiveSubscription | null;
        };

        const subscription = data.subscription ?? null;
        const planType =
          (subscription?.plan?.planType as PlanType | undefined) ?? null;
        const isPro =
          !!planType && planType.toString().toLowerCase() !== "free";

        set({
          subscription,
          planType,
          isPro,
          hasFetched: true,
          isLoading: false,
          error: null,
        });
      } catch {
        set({
          subscription: null,
          planType: "free",
          isPro: false,
          hasFetched: true,
          isLoading: false,
          error: "Failed to load subscription",
        });
      }
    },
  }),
);

