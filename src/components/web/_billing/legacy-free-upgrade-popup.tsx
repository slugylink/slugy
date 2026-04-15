"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubscriptionStore } from "@/store/subscription";

function isLegacyFreePlan(planType: string | null, planName?: string | null) {
  const normalizedType = (planType ?? "").toLowerCase();
  const normalizedName = (planName ?? "").toLowerCase();
  return normalizedType === "free" || normalizedName === "free";
}

function isLegacyUnpaidBasicSubscription(input: {
  planType: string | null;
  customerId?: string | null;
  provider?: string | null;
  priceId?: string | null;
}) {
  const normalizedType = (input.planType ?? "").toLowerCase();
  const normalizedProvider = (input.provider ?? "").toLowerCase();
  const hasCustomerId = Boolean(
    input.customerId && input.customerId.trim().length > 0,
  );
  const hasPriceId = Boolean(input.priceId && input.priceId.trim().length > 0);

  return (
    normalizedType === "basic" &&
    !hasCustomerId &&
    (normalizedProvider === "internal" || !hasPriceId)
  );
}

export default function LegacyFreeUpgradePopup() {
  const pathname = usePathname();
  const { subscription, planType, fetchSubscription, hasFetched } =
    useSubscriptionStore();

  useEffect(() => {
    void fetchSubscription();
  }, [fetchSubscription]);

  const isExemptPage = useMemo(() => {
    if (!pathname) return false;
    return (
      /\/invite\/?$/.test(pathname) ||
      /\/verify-email\/?$/.test(pathname) ||
      /\/reset-password\/?$/.test(pathname) ||
      /\/forgot-password\/?$/.test(pathname) ||
      /\/email-verified\/?$/.test(pathname) ||
      /\/signup\/?$/.test(pathname) ||
      /\/login\/?$/.test(pathname) ||
      /\/upgrade\/?$/.test(pathname) ||
      /\/settings\/billing\/upgrade\/?$/.test(pathname) ||
      /\/account\/?$/.test(pathname)
    );
  }, [pathname]);

  const workspaceSlug = useMemo(() => {
    if (!pathname) return null;
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;
    return segments[0] ?? null;
  }, [pathname]);

  const upgradePath = useMemo(() => {
    if (!workspaceSlug) return "/app/upgrade";
    return `/${workspaceSlug}/settings/billing/upgrade`;
  }, [workspaceSlug]);

  const shouldShow = useMemo(() => {
    if (!hasFetched) return false;
    if (isExemptPage) return false;
    return (
      isLegacyFreePlan(planType, subscription?.plan?.name) ||
      isLegacyUnpaidBasicSubscription({
        planType,
        customerId: subscription?.customerId,
        provider: subscription?.provider,
        priceId: subscription?.priceId,
      })
    );
  }, [
    hasFetched,
    isExemptPage,
    planType,
    subscription?.plan?.name,
    subscription?.customerId,
    subscription?.provider,
    subscription?.priceId,
  ]);

  return (
    <Dialog open={shouldShow}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Upgrade Required</DialogTitle>
          <DialogDescription>
            Your account is on a legacy Free plan. Please upgrade to continue
            with Basic ($1 Forever) or Pro ($10/month).
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            asChild
            size={"sm"}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Link href={`${upgradePath}?plan=basic`}>Get Basic</Link>
          </Button>
          <Button asChild size={"sm"} className="w-full sm:w-auto">
            <Link href={`${upgradePath}?plan=pro`}>Get Pro</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
