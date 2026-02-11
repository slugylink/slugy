import { type NextRequest, NextResponse } from "next/server";
import { URLRedirects } from "@/lib/middleware/redirection";
import { handleTempRedirect } from "@/lib/middleware/temp-redirect";
import { getCachedSession } from "@/lib/middleware/get-session";
import { handleCustomDomainRequest } from "@/lib/middleware/custom-domain";

import {
  checkRateLimit,
  checkFastRateLimit,
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

const getClientIP = (req: NextRequest): string => {
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return normalizeIp(ip);
};

const redirectTo = (url: string, status = 307) =>
  addSecurityHeaders(NextResponse.redirect(new URL(url), status));

const rewriteTo = (url: string, baseUrl: string) =>
  addSecurityHeaders(NextResponse.rewrite(new URL(url, baseUrl)));

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
  hostname === SUBDOMAINS.admin;

const normalizeHostname = (host: string | null): string =>
  host
    ?.toLowerCase()
    .replace(/\.localhost:3000$/, `.${ROOT_DOMAIN}`)
    .trim() ?? "";

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
    if (!IS_PRODUCTION && hostname === SUBDOMAINS.webhook) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      const clientIP = getClientIP(req);
      const isFastUser = isFastApiRoute(pathname);

      if (process.env.NODE_ENV !== "development" && isKnownDomain(hostname)) {
        const limitResult = isFastUser
          ? checkFastRateLimit(clientIP)
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

    switch (hostname) {
      case SUBDOMAINS.bio: {
        const bioPath = pathname === "/" ? "/bio" : `/bio${pathname}`;
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

async function handleAppSubdomain(
  url: URL,
  req: NextRequest,
  baseUrl: string,
): Promise<NextResponse> {
  const { pathname, search } = url;
  const prefixedPath = `/app${pathname}${search}`;
  const isAlreadyInApp = pathname.startsWith("/app");
  const isAuthPage = AUTH_PATHS.has(pathname);

  // Fetch session once
  const { token } = await getCachedSession(req);

  // Handle root path
  if (pathname === "/") {
    if (token) {
      return addSecurityHeaders(
        NextResponse.rewrite(new URL(prefixedPath, baseUrl)),
      );
    }
    return addSecurityHeaders(
      NextResponse.redirect(new URL("/login", baseUrl)),
    );
  }

  // Handle auth pages
  if (isAuthPage) {
    if (token && (pathname === "/login" || pathname === "/signup")) {
      return addSecurityHeaders(NextResponse.redirect(new URL("/", baseUrl)));
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
      NextResponse.redirect(new URL("/app/login", baseUrl)),
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

  if (pathname === "/") {
    const { token } = await getCachedSession(req);
    if (token) {
      const appUrl = new URL(req.url);
      appUrl.hostname = SUBDOMAINS.app;
      return redirectTo(appUrl.toString());
    }
  }

  if (pathname.startsWith("/api/") || isStaticAsset(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  if (!isPublicPath(pathname) && pathname !== "/" && shortCode.length > 0) {
    if (shortCode.endsWith("&c")) {
      const tempRedirect = await handleTempRedirect(req, shortCode);
      if (tempRedirect) return tempRedirect;
    }

    const redirectResponse = await URLRedirects(req, shortCode, hostname);
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
