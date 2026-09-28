import { headers } from "next/headers";

/**
 * Root origin for workspace short links, derived server-side from the
 * request host (bio.slugy.co/…) so public bio cards render their final
 * href on first paint without a client-side lookup + re-render.
 */
export async function getShortLinkOrigin(): Promise<string | null> {
  try {
    const headerList = await headers();
    const host = headerList.get("host")?.trim();
    if (!host) return null;
    const proto =
      headerList.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (process.env.NODE_ENV === "production" ? "https" : "http");
    const root = host.startsWith("bio.") ? host.slice("bio.".length) : host;
    return `${proto}://${root}`;
  } catch {
    return null;
  }
}
