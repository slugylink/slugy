const DEFAULT_ROOT = "slugy.co";

function getRootHosts(): string[] {
  const root =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN?.replace(/:\d+$/, "").toLowerCase() ||
    DEFAULT_ROOT;
  const hosts = new Set<string>([
    root,
    `www.${root}`,
    `app.${root}`,
    `bio.${root}`,
    DEFAULT_ROOT,
    `www.${DEFAULT_ROOT}`,
    `app.${DEFAULT_ROOT}`,
  ]);
  return Array.from(hosts);
}

export function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * True when destination would create a short-link loop on our root
 * (or an optional list of verified custom domains).
 */
export function isRecursiveShortLink(
  destinationUrl: string,
  customDomains: string[] = [],
): boolean {
  try {
    const parsed = new URL(destinationUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return true; // treat non-http as unsafe for shortening
    }

    const hostname = parsed.hostname.toLowerCase();
    const blockedHosts = new Set([
      ...getRootHosts(),
      ...customDomains.map((d) => d.toLowerCase()),
    ]);

    if (!blockedHosts.has(hostname)) {
      return false;
    }

    // Any path on our short-link hosts is recursive (/, /foo, /foo/bar, query ok)
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    if (path === "/") return false; // landing page is fine
    // Single-segment slugs and nested paths on short hosts are loops
    return true;
  } catch {
    return true;
  }
}

export async function assertSafeDestinationUrl(
  url: string,
  options?: { customDomains?: string[]; skipSafetyScan?: boolean },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isHttpUrl(url)) {
    return { ok: false, message: "Only http(s) URLs are allowed" };
  }

  if (isRecursiveShortLink(url, options?.customDomains ?? [])) {
    return {
      ok: false,
      message:
        "Recursive links are not allowed. You cannot shorten a Slugy or custom-domain short link.",
    };
  }

  if (options?.skipSafetyScan) {
    return { ok: true };
  }

  try {
    const { validateUrlSafety } = await import("@/server/actions/url-scan");
    const result = await validateUrlSafety(url);
    if (!result.isValid) {
      return {
        ok: false,
        message:
          result.message ||
          "This URL failed the safety check and cannot be shortened.",
      };
    }
  } catch (error) {
    console.error("[URL Policy] Safety scan error:", error);
    // Fail open only on infra errors; malware path already handled above
  }

  return { ok: true };
}
