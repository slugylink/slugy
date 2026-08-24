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

function isPaidPolarEntitlement(input: {
  customerId?: string | null;
  provider?: string | null;
  priceId?: string | null;
  status?: string | null;
}) {
  const provider = (input.provider ?? "").toLowerCase();
  const status = (input.status ?? "").toLowerCase();
  const hasCustomerId = Boolean(input.customerId?.trim());
  const hasPriceId = Boolean(input.priceId?.trim());
  const isActive = !status || ["active", "trialing"].includes(status);

  return isActive && (provider === "polar" || hasCustomerId || hasPriceId);
}

function isLegacyUnpaidBasicSubscription(input: {
  planType: string | null;
  customerId?: string | null;
  provider?: string | null;
  priceId?: string | null;
  status?: string | null;
  hasSubscriptionRecord: boolean;
}) {
  if (!input.hasSubscriptionRecord) return false;
  if (isPaidPolarEntitlement(input)) return false;

  const normalizedType = (input.planType ?? "").toLowerCase();
  const normalizedProvider = (input.provider ?? "").toLowerCase();
  const hasCustomerId = Boolean(input.customerId?.trim());

  return (
    normalizedType === "basic" &&
    !hasCustomerId &&
    (normalizedProvider === "internal" || normalizedProvider === "")
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
    if (
      isPaidPolarEntitlement({
        customerId: subscription?.customerId,
        provider: subscription?.provider,
        priceId: subscription?.priceId,
        status: subscription?.status,
      })
    ) {
      return false;
    }

    return (
      isLegacyFreePlan(planType, subscription?.plan?.name) ||
      isLegacyUnpaidBasicSubscription({
        planType,
        customerId: subscription?.customerId,
        provider: subscription?.provider,
        priceId: subscription?.priceId,
        status: subscription?.status,
        hasSubscriptionRecord: Boolean(subscription?.id),
      })
    );
  }, [
    hasFetched,
    isExemptPage,
    planType,
    subscription?.id,
    subscription?.plan?.name,
    subscription?.customerId,
    subscription?.provider,
    subscription?.priceId,
    subscription?.status,
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
