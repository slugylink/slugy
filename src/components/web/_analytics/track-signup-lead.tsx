"use client";

import { useEffect } from "react";
import { createAuthClient } from "better-auth/react";
import { getSlugyId } from "@/lib/leads/attribution";

const { useSession } = createAuthClient();

/**
 * Post-login fallback for OAuth / magic-link / verified-email signups where
 * the signup form never runs. Idempotent server-side (same user + sign_up
 * won't double-count), so firing once per user is safe.
 */
export function TrackSignupLead() {
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending || !session?.user?.id) return;
    const clickId = getSlugyId();
    if (!clickId) return;

    const flag = `slugy_lead_tracked_${session.user.id}`;
    try {
      if (sessionStorage.getItem(flag)) return;
      sessionStorage.setItem(flag, "1");
    } catch {
      // ignore storage errors — API is idempotent anyway
    }

    fetch("/api/leads/track-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clickId }),
    }).catch(() => {});
  }, [isPending, session?.user?.id]);

  return null;
}
