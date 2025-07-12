import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { checkRateLimit, normalizeIp } from "./lib/middleware/rate-limit";
import { URLRedirects } from "./lib/middleware/redirection";

// Route configurations
export const PUBLIC_ROUTES = new Set([
  "/login",
  "/test",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/terms",
  "/privacy",
  "/404",
  "/500",
  "/not-found",
  "/onboarding",
  "/onboarding/welcome",
  "/pricing",
  "/features",
  "/about",
  "/contact",
  "/blog",
]);

export const PUBLIC_PREFIXES = [
  "/api/",
  "/api/auth",
  "/api/public",
  "/_next",
  "/static",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

// Fast API route patterns for early exit
const FAST_API_PATTERNS = [
  /^\/api\/link\/[^\/]+$/,
  /^\/api\/analytics\/track$/,
  /^\/api\/redirect\/[^\/]+$/,
  /^\/api\/metadata$/,
  /^\/api\/rate-limit$/,
];

// Auth paths
const AUTH_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/app/login",
  "/app/signup",
  "/app/forgot-password",
  "/app/reset-password",
]);

const AUTH_REWRITES: Record<string, string> = {
  "/login": "/app/login",
  "/signup": "/app/signup",
  "/forgot-password": "/app/forgot-password",
  "/reset-password": "/app/reset-password",
};

// Security headers
const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "on",
  "Cross-Origin-Opener-Policy": "same-origin",
} as const;

// Environment variables
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() ?? "";
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET?.trim();
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Validate critical environment variables
if (!ROOT_DOMAIN || !BETTER_AUTH_SECRET) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_ROOT_DOMAIN, BETTER_AUTH_SECRET",
  );
}

// Subdomains
export const SUBDOMAINS = {
  bio: `bio.${ROOT_DOMAIN}`,
  app: `app.${ROOT_DOMAIN}`,
  admin: `admin.${ROOT_DOMAIN}`,
} as const;

// Optimize matcher configuration for faster routing
export const config = {
  matcher: [
    // Prioritize API routes for faster matching
    "/api/:path*",
    // Static assets
    "/((?!_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
    "/",
  ],
};

// Enhanced cached path checker with API optimization
const isPublicPath = (() => {
  const cache = new Map<string, boolean>();
  return (path: string): boolean => {
    if (cache.has(path)) return cache.get(path)!;

    // Fast check for API routes
    if (path.startsWith("/api/")) {
      const isPublic = true; // All API routes are considered public for middleware
      if (cache.size < 1000) cache.set(path, isPublic);
      return isPublic;
    }

    const isPublic =
      PUBLIC_ROUTES.has(path) ||
      PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));

    if (cache.size < 1000) cache.set(path, isPublic);
    return isPublic;
  };
})();

// Fast API route checker
const isFastApiRoute = (pathname: string): boolean => {
  return FAST_API_PATTERNS.some(pattern => pattern.test(pathname));
};

// Hostname normalization with enhanced cache
const hostnameCache = new Map<string, string>();
const normalizeHostname = (host: string | null): string => {
  if (!host) return "";
  if (hostnameCache.has(host)) return hostnameCache.get(host)!;

  const normalized = host
    .toLowerCase()
    .replace(/\.localhost:3000$/, `.${ROOT_DOMAIN}`)
    .trim();

  if (hostnameCache.size < 100) hostnameCache.set(host, normalized);
  return normalized;
};

// Optimized helper functions
const addSecurityHeaders = (response: NextResponse): NextResponse => {
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    response.headers.set(header, value);
  });
  return response;
};

const createRateLimitResponse = (
  error: string,
  limit: number,
  reset: number,
  remaining: number,
): NextResponse => {
  return new NextResponse(JSON.stringify({ error, limit, reset, remaining }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
      ...SECURITY_HEADERS,
    },
  });
};

const redirectTo = (url: string, status = 307): NextResponse => {
  return addSecurityHeaders(NextResponse.redirect(new URL(url), status));
};

const rewriteTo = (url: string, baseUrl: string): NextResponse => {
  return addSecurityHeaders(NextResponse.rewrite(new URL(url, baseUrl)));
};

// Fast API response for high-traffic endpoints
const createFastApiResponse = (): NextResponse => {
  return addSecurityHeaders(NextResponse.next());
};

// Main middleware function with API optimizations
export async function middleware(req: NextRequest) {
  try {
    const url = req.nextUrl.clone();
    const pathname = url.pathname;

    // Ultra-fast early return for static assets
    if (pathname.startsWith("/_next") || pathname.startsWith("/static")) {
      return NextResponse.next();
    }

    // Fast path for API routes
    if (pathname.startsWith("/api/")) {
      // Ultra-fast return for high-traffic API endpoints
      if (isFastApiRoute(pathname)) {
        return createFastApiResponse();
      }

      // Rate limiting only for non-fast API routes in production
      if (IS_PRODUCTION) {
        const ip = normalizeIp(req.headers.get("x-forwarded-for") ?? "unknown");
        const { success, limit, reset, remaining } = await checkRateLimit(ip);

        if (!success) {
          return createRateLimitResponse(
            "Too many requests",
            limit,
            reset,
            remaining,
          );
        }
      }

      return addSecurityHeaders(NextResponse.next());
    }

    // Get session cookie for non-API routes
    const sessionCookie = getSessionCookie(req);

    // Enforce HTTPS in production (skip for API routes)
    if (IS_PRODUCTION && req.headers.get("x-forwarded-proto") !== "https") {
      const httpsUrl = new URL(req.url);
      httpsUrl.protocol = "https:";
      return redirectTo(httpsUrl.toString(), 308);
    }

    const hostname = normalizeHostname(req.headers.get("host"));

    // Handle different subdomains
    switch (hostname) {
      case SUBDOMAINS.bio:
        const bioPath = pathname === "/" ? "/bio" : `/bio${pathname}`;
        return rewriteTo(`${bioPath}${url.search}`, req.url);

      case SUBDOMAINS.app:
        return handleAppSubdomain(url, sessionCookie, req.url);

      case SUBDOMAINS.admin:
        const adminPath = pathname === "/" ? "/admin" : `/admin${pathname}`;
        return rewriteTo(`${adminPath}${url.search}`, req.url);

      case ROOT_DOMAIN:
        return handleRootDomain(url, sessionCookie, req);

      default:
        return handleCustomDomain(url, hostname, req.url);
    }
  } catch (error: unknown) {
    console.error(
      "Middleware error:",
      error instanceof Error ? error.message : String(error),
    );
    return redirectTo("/login");
  }
}

// Handle app subdomain
async function handleAppSubdomain(
  url: URL,
  token: unknown,
  baseUrl: string,
): Promise<NextResponse> {
  const { pathname } = url;

  // Redirect authenticated users away from auth pages
  if (token && AUTH_PATHS.has(pathname)) {
    return redirectTo(new URL("/", baseUrl).toString());
  }

  // Redirect unauthenticated users to login
  if (!token && !isPublicPath(pathname)) {
    return redirectTo(new URL("/login", baseUrl).toString());
  }

  // Handle root path
  if (pathname === "/") {
    return token
      ? rewriteTo("/app", baseUrl)
      : redirectTo(new URL("/login", baseUrl).toString());
  }

  // Handle auth page rewrites
  if (AUTH_REWRITES[pathname]) {
    return rewriteTo(AUTH_REWRITES[pathname], baseUrl);
  }

  // Rewrite authenticated user paths to app directory
  if (token && !pathname.startsWith("/app")) {
    return rewriteTo(`/app${pathname}${url.search}`, baseUrl);
  }

  return addSecurityHeaders(NextResponse.next());
}

// Handle root domain with API optimizations
async function handleRootDomain(
  url: URL,
  token: unknown,
  req: NextRequest,
): Promise<NextResponse> {
  const { pathname } = url;
  const shortCode = pathname.slice(1);

  // Redirect authenticated users to app subdomain
  if (pathname === "/" && token) {
    const appUrl = new URL(req.url);
    appUrl.hostname = SUBDOMAINS.app;
    return redirectTo(appUrl.toString());
  }

  // Skip rewriting for system paths
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".")
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Short link redirection - only process if not public path and not root
  if (!isPublicPath(pathname) && pathname !== "/") {
    const destination = await URLRedirects(shortCode, req);
    if (destination) {
      return NextResponse.redirect(new URL(destination), 302);
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

// Handle custom domains
function handleCustomDomain(
  url: URL,
  hostname: string,
  baseUrl: string,
): NextResponse {
  const { pathname } = url;

  // Redirect app paths to app subdomain
  if (pathname.startsWith("/app")) {
    const redirectPath = pathname.replace(/^\/app/, "") || "/";
    return redirectTo(`https://${SUBDOMAINS.app}${redirectPath}`);
  }

  // Handle custom domains
  return rewriteTo(`/${hostname}${pathname}${url.search}`, baseUrl);
}
