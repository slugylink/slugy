import { type NextRequest, NextResponse } from "next/server";
import { URLRedirects } from "@/lib/middleware/redirection";
import { handleTempRedirect } from "@/lib/middleware/temp-redirect";
import { getCachedSession } from "@/lib/middleware/get-session";
import { resolveDefaultWorkspaceRedirect } from "@/lib/middleware/get-default-workspace-redirect";
import { handleCustomDomainRequest } from "@/lib/middleware/custom-domain";

import {
  checkRateLimit,
  checkFastRateLimit,
  checkRedirectRateLimit,
  normalizeIp,
} from "@/lib/middleware/rate-limit";

import {
  AUTH_PATHS,
  FAST_API_PATTERNS,
  IS_PRODUCTION,
  PUBLIC_PREFIXES,
  PUBLIC_ROUTES,
  ROOT_DOMAIN,
  SECURITY_HEADERS,
  SUBDOMAINS,
} from "@/lib/middleware/routes";

if (!ROOT_DOMAIN) {
  throw new Error("Missing required env var: NEXT_PUBLIC_ROOT_DOMAIN");
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
    "/",
  ],
};

//─────────── Constants ───────────

const STATIC_ASSETS_EXTENSIONS =
  /\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|webp|avif)$/;
const STATIC_ASSET_PATHS = ["_next", "static", "images", "icons"] as const;
const DEFAULT_SHORTLINK_DOMAIN = "slugy.co";

const isStaticAsset = (pathname: string): boolean => {
  if (STATIC_ASSETS_EXTENSIONS.test(pathname)) return true;
  return (
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    STATIC_ASSET_PATHS.some((p) => pathname.startsWith(`/${p}`))
  );
};
const getRetryAfterSeconds = (resetTime: number): number =>
  Math.ceil((resetTime - Date.now()) / 1000);

//─────────── Helpers ───────────

const addSecurityHeaders = (res: NextResponse): NextResponse => {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) =>
    res.headers.set(key, value),
  );
  return res;
};

/**
 * Prefer platform-injected IPs. Never prefer client-spoofable `cf-connecting-ip`
 * unless Cloudflare is known to sit in front (CF-Ray present).
 * On Vercel, `x-real-ip` / the rightmost `x-forwarded-for` hop is trustworthy.
 */
const getClientIP = (req: NextRequest): string => {
  const hasCloudflare = Boolean(req.headers.get("cf-ray"));
  const forwarded = req.headers.get("x-forwarded-for");
  const forwardedHops = forwarded
    ?.split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);

  const ip =
    (hasCloudflare ? req.headers.get("cf-connecting-ip") : null) ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    forwardedHops?.[forwardedHops.length - 1] ||
    "unknown";

  return normalizeIp(ip);
};

const redirectTo = (url: string, status = 307) =>
  addSecurityHeaders(NextResponse.redirect(new URL(url), status));

const rewriteTo = (url: string, baseUrl: string) =>
  addSecurityHeaders(NextResponse.rewrite(new URL(url, baseUrl)));

const resolveBioSubdomainPath = (pathname: string): string => {
  if (pathname === "/") {
    return "/bio";
  }

  // Backward compatibility for older bio paths.
  if (pathname === "/bio" || pathname === "/bio/") {
    return "/bio";
  }

  if (pathname.startsWith("/bio/")) {
    const usernamePath = pathname.slice("/bio".length);
    return `/b${usernamePath}`;
  }

  if (pathname.startsWith("/b/")) {
    return pathname;
  }

  return `/b${pathname}`;
};

const isPublicPath = (path: string): boolean =>
  path.startsWith("/api/") ||
  PUBLIC_ROUTES.has(path) ||
  PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));

const isFastApiRoute = (pathname: string): boolean =>
  FAST_API_PATTERNS.some((pattern) => pattern.test(pathname));

const isKnownDomain = (hostname: string): boolean =>
  hostname === ROOT_DOMAIN ||
  hostname === SUBDOMAINS.bio ||
  hostname === SUBDOMAINS.app ||
  hostname === SUBDOMAINS.admin ||
  hostname === SUBDOMAINS.api;

const isLocalSubdomain = (
  hostname: string,
  subdomain: "app" | "bio" | "admin" | "api" | "webhook",
): boolean =>
  !IS_PRODUCTION &&
  (hostname === `${subdomain}.localhost` ||
    hostname.startsWith(`${subdomain}.localhost:`) ||
    hostname === `${subdomain}.127.0.0.1` ||
    hostname.startsWith(`${subdomain}.127.0.0.1:`));

const normalizeHostname = (host: string | null): string =>
  (() => {
    const normalized = host?.toLowerCase().trim() ?? "";
    if (!normalized) return "";

    // In local development, treat localhost as the root domain for routing.
    if (
      !IS_PRODUCTION &&
      (normalized.startsWith("localhost:") ||
        normalized.startsWith("127.0.0.1:"))
    ) {
      return ROOT_DOMAIN;
    }

    return normalized.replace(/\.localhost(?::\d+)?$/, `.${ROOT_DOMAIN}`);
  })();

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const rateLimitExceededResponse = (result: RateLimitResult) => {
  const retryAfter = getRetryAfterSeconds(result.reset);
  return addSecurityHeaders(
    new NextResponse(
      JSON.stringify({
        error: "Rate limit exceeded",
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": new Date(result.reset).toISOString(),
          "Retry-After": retryAfter.toString(),
        },
      },
    ),
  );
};

//─────────── Main Middleware ───────────

export async function proxy(req: NextRequest): Promise<NextResponse> {
  try {
    const { pathname } = req.nextUrl;
    const url = req.nextUrl.clone();

    if (isStaticAsset(pathname)) {
      return NextResponse.next();
    }

    const hostname = normalizeHostname(req.headers.get("host"));

    // Allow webhook subdomain to pass through untouched during local development
    if (
      hostname === SUBDOMAINS.webhook ||
      isLocalSubdomain(hostname, "webhook")
    ) {
      return NextResponse.next();
    }

    if (hostname === SUBDOMAINS.api || isLocalSubdomain(hostname, "api")) {
      if (!pathname.startsWith("/api/")) {
        const apiPath =
          pathname === "/" ? "/api/leads_track" : `/api${pathname}`;
        return rewriteTo(`${apiPath}${url.search}`, req.url);
      }
      return addSecurityHeaders(NextResponse.next());
    }

    if (pathname.startsWith("/api/")) {
      const clientIP = getClientIP(req);
      const isFastUser = isFastApiRoute(pathname);

      if (process.env.NODE_ENV !== "development" && isKnownDomain(hostname)) {
        const limitResult = isFastUser
          ? await checkFastRateLimit(clientIP)
          : await checkRateLimit(clientIP);

        if (!limitResult.success) {
          return rateLimitExceededResponse(limitResult);
        }
      }

      return addSecurityHeaders(NextResponse.next());
    }

    // HTTPS redirect (should be early) - Vercel handles SSL for custom domains
    if (IS_PRODUCTION && req.headers.get("x-forwarded-proto") !== "https") {
      const httpsURL = new URL(req.url);
      httpsURL.protocol = "https:";
      return redirectTo(httpsURL.toString(), 308);
    }

    if (isLocalSubdomain(hostname, "bio")) {
      const bioPath = resolveBioSubdomainPath(pathname);
      return rewriteTo(`${bioPath}${url.search}`, req.url);
    }

    if (isLocalSubdomain(hostname, "app")) {
      return handleAppSubdomain(url, req, req.url);
    }

    if (isLocalSubdomain(hostname, "admin")) {
      const adminPath = pathname === "/" ? "/admin" : `/admin${pathname}`;
      return rewriteTo(`${adminPath}${url.search}`, req.url);
    }

    switch (hostname) {
      case SUBDOMAINS.bio: {
        const bioPath = resolveBioSubdomainPath(pathname);
        return rewriteTo(`${bioPath}${url.search}`, req.url);
      }

      case SUBDOMAINS.app:
        return handleAppSubdomain(url, req, req.url);

      case SUBDOMAINS.admin: {
        const adminPath = pathname === "/" ? "/admin" : `/admin${pathname}`;
        return rewriteTo(`${adminPath}${url.search}`, req.url);
      }

      case ROOT_DOMAIN:
        return handleRootDomain(url, req);

      default:
        return handleCustomDomain(url, hostname, req.url, req);
    }
  } catch (err) {
    console.error("Middleware Error:", err);
    return addSecurityHeaders(
      NextResponse.redirect(new URL("/login", req.url)),
    );
  }
}

//─────────── App Subdomain Handlers ───────────

async function redirectAuthenticatedUserToWorkspace(
  req: NextRequest,
  baseUrl: string,
  search: string,
  redirectStatus: number,
): Promise<NextResponse | null> {
  const result = await resolveDefaultWorkspaceRedirect(req);

  if (result.status === "redirect") {
    return addSecurityHeaders(
      NextResponse.redirect(
        new URL(`/${result.slug}${search}`, baseUrl),
        redirectStatus,
      ),
    );
  }

  if (result.status === "onboarding") {
    return addSecurityHeaders(
      NextResponse.redirect(
        new URL(`/onboarding/welcome${search}`, baseUrl),
        redirectStatus,
      ),
    );
  }

  return null;
}

async function handleAppSubdomain(
  url: URL,
  req: NextRequest,
  baseUrl: string,
): Promise<NextResponse> {
  const { pathname, search } = url;
  const prefixedPath = `/app${pathname}${search}`;
  const isAlreadyInApp = pathname.startsWith("/app");
  const isAuthPage = AUTH_PATHS.has(pathname);
  const shouldPreserveMethod = req.method === "GET" || req.method === "HEAD";
  const authRedirectStatus = shouldPreserveMethod ? 307 : 303;
  const appAuthRouteMap: Record<string, string> = {
    "/app/login": "/login",
    "/app/signup": "/signup",
    "/app/forgot-password": "/forgot-password",
    "/app/reset-password": "/reset-password",
  };

  // Fetch session once
  const { token } = await getCachedSession(req);

  // Handle root path
  if (pathname === "/") {
    if (token) {
      const workspaceRedirect = await redirectAuthenticatedUserToWorkspace(
        req,
        baseUrl,
        search,
        authRedirectStatus,
      );
      if (workspaceRedirect) return workspaceRedirect;

      return addSecurityHeaders(
        NextResponse.rewrite(new URL(prefixedPath, baseUrl)),
      );
    }
    return addSecurityHeaders(
      NextResponse.redirect(new URL("/login", baseUrl), authRedirectStatus),
    );
  }

  // Handle auth pages
  if (isAuthPage) {
    // Keep auth routes canonical on app subdomain (e.g. /login, /signup).
    if (pathname in appAuthRouteMap) {
      const canonicalPath = appAuthRouteMap[pathname];
      return addSecurityHeaders(
        NextResponse.redirect(
          new URL(`${canonicalPath}${search}`, baseUrl),
          authRedirectStatus,
        ),
      );
    }

    if (token && (pathname === "/login" || pathname === "/signup")) {
      const workspaceRedirect = await redirectAuthenticatedUserToWorkspace(
        req,
        baseUrl,
        search,
        authRedirectStatus,
      );
      if (workspaceRedirect) return workspaceRedirect;

      return addSecurityHeaders(
        NextResponse.redirect(new URL("/", baseUrl), authRedirectStatus),
      );
    }

    if (!isAlreadyInApp) {
      return addSecurityHeaders(
        NextResponse.rewrite(new URL(prefixedPath, baseUrl)),
      );
    }

    return addSecurityHeaders(NextResponse.next());
  }

  // Check authentication for non-public paths
  if (!isPublicPath(pathname) && !token) {
    return addSecurityHeaders(
      NextResponse.redirect(new URL("/login", baseUrl), authRedirectStatus),
    );
  }

  // Rewrite to app subdirectory if needed
  if (!isAlreadyInApp) {
    return addSecurityHeaders(
      NextResponse.rewrite(new URL(prefixedPath, baseUrl)),
    );
  }

  return addSecurityHeaders(NextResponse.next());
}

async function handleRootDomain(
  url: URL,
  req: NextRequest,
): Promise<NextResponse> {
  const { pathname } = url;
  const shortCode = pathname.slice(1);
  const hostname = normalizeHostname(req.headers.get("host"));
  const shortLinkLookupDomain =
    !IS_PRODUCTION && ROOT_DOMAIN.includes("localhost")
      ? DEFAULT_SHORTLINK_DOMAIN
      : hostname;
  const shouldPreserveMethod = req.method === "GET" || req.method === "HEAD";
  const redirectStatus = shouldPreserveMethod ? 307 : 303;

  if (pathname === "/") {
    const { token } = await getCachedSession(req);
    if (token) {
      const appUrl = new URL(req.url);
      appUrl.hostname = SUBDOMAINS.app;
      return redirectTo(appUrl.toString(), redirectStatus);
    }
  }

  if (pathname.startsWith("/api/") || isStaticAsset(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Allow root-domain bio route (/b/:username) to resolve directly.
  if (pathname.startsWith("/b/") && pathname.length > 3) {
    return addSecurityHeaders(NextResponse.next());
  }

  if (!isPublicPath(pathname) && pathname !== "/" && shortCode.length > 0) {
    if (process.env.NODE_ENV !== "development") {
      const redirectLimit = await checkRedirectRateLimit(getClientIP(req));
      if (!redirectLimit.success) {
        return rateLimitExceededResponse(redirectLimit);
      }
    }

    if (shortCode.endsWith("&c")) {
      const tempRedirect = await handleTempRedirect(req, shortCode);
      if (tempRedirect) return tempRedirect;
    }

    const redirectResponse = await URLRedirects(
      req,
      shortCode,
      shortLinkLookupDomain,
    );
    if (redirectResponse) return redirectResponse;
  }

  return addSecurityHeaders(NextResponse.next());
}

async function handleCustomDomain(
  url: URL,
  hostname: string,
  baseUrl: string,
  req: NextRequest,
): Promise<NextResponse> {
  const { pathname } = url;

  if (pathname === "/") {
    return rewriteTo("/custom-domain", baseUrl);
  }

  try {
    const customDomainResponse = await handleCustomDomainRequest(req, hostname);
    if (customDomainResponse) {
      return customDomainResponse;
    }
  } catch (error) {
    console.error("Error handling custom domain request:", error);
  }

  return rewriteTo("/custom-domain/not-found", baseUrl);
}
