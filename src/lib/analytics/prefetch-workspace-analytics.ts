import { headers } from "next/headers";
import type { AnalyticsData } from "@/hooks/use-analytics";

const FILTER_KEYS = [
  "slug_key",
  "country_key",
  "city_key",
  "continent_key",
  "browser_key",
  "os_key",
  "device_key",
  "referrer_key",
  "destination_key",
  "domain_key",
  "time_period",
] as const;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Prefetch analytics via the same Tinybird API the client uses,
 * forwarding cookies so auth matches the dashboard session.
 */
export async function prefetchWorkspaceAnalytics(
  workspaceslug: string,
  searchParams: Record<string, string | string[] | undefined>,
): Promise<Partial<AnalyticsData> | null> {
  const slug = workspaceslug?.trim();
  if (!slug) return null;

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return null;

    const proto = h.get("x-forwarded-proto") ?? "https";
    const cookie = h.get("cookie") ?? "";

    const qs = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = firstParam(searchParams[key]);
      if (!value) continue;
      if (key === "time_period" && value === "24h") continue;
      qs.set(key, value);
    }

    const query = qs.toString();
    const url = `${proto}://${host}/api/workspace/${encodeURIComponent(slug)}/analytics/tinybird${query ? `?${query}` : ""}`;

    const res = await fetch(url, {
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });

    if (!res.ok) return null;
    return (await res.json()) as Partial<AnalyticsData>;
  } catch (error) {
    console.error("[prefetchWorkspaceAnalytics]", error);
    return null;
  }
}
