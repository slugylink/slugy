"use client";

import { useEffect } from "react";
import { getSlugyId, setSlugyIdCookie } from "@/lib/leads/attribution";
import { SLUGY_ID_PARAM } from "@/lib/leads/constants";

/**
 * Persist ?slugy_id from a short-link redirect as a first-party cookie so a
 * later /signup or /checkout page can still attribute the conversion.
 * Mount once in the root layout (covers marketing + app).
 */
export function CaptureSlugyId() {
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get(SLUGY_ID_PARAM);
    if (!id) return;

    setSlugyIdCookie(id);

    const url = new URL(window.location.href);
    url.searchParams.delete(SLUGY_ID_PARAM);
    window.history.replaceState({}, "", url.toString());
  }, []);

  return null;
}

export { getSlugyId };
