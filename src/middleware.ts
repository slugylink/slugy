import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import {
  appendGeoAndUserAgent,
  extractUserAgentData,
} from "./lib/middleware/user-agent";
import {
  checkRateLimit,
  checkTempLinkRateLimit,
  normalizeIp,
} from "./lib/middleware/rate-limit";
import {
  PUBLIC_ROUTE_PREFIXES,
  PUBLIC_ROUTE_SET,
  SUBDOMAINS,
} from "./lib/middleware/routes";
import { URLRedirects } from "./lib/middleware/redirection";

// Optimize matcher configuration for better performance
export const config = {
  matcher: [
    "/",
    "/((?!_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
    "/api/:path*",
    "/api/auth/:path*",
    "/api/workspace/:path*",
  ],
};

// Pre-computed security headers
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
const ASSETS_URL = process.env.NEXT_PUBLIC_ASSETS?.trim();

// Validate critical environment variables
if (!ROOT_DOMAIN || !BETTER_AUTH_SECRET) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_ROOT_DOMAIN, BETTER_AUTH_SECRET",
  );
}

// Cached path checkers
const isPublicPath = (() => {
  const cache = new Map<string, boolean>();
  return (path: string): boolean => {
    if (cache.has(path)) return cache.get(path)!;

    const isPublic =
      PUBLIC_ROUTE_SET.has(path) ||
      PUBLIC_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));

    if (cache.size < 1000) cache.set(path, isPublic);
    return isPublic;
  };
})();

// Cached hostname normalization
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

// Rate limiting response helper
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

// Apply security headers helper
function addSecurityHeaders(response: NextResponse): NextResponse {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
  return response;
}

export async function middleware(req: NextRequest) {
  try {
    const url = req.nextUrl.clone();
    const pathname = url.pathname;

    // Early return for static assets
    if (pathname.startsWith("/_next") || pathname.startsWith("/static")) {
      return NextResponse.next();
    }

    // Get session cookie only when needed
    const sessionCookie = getSessionCookie(req);

    // Rate limiting for API routes in production
    if (IS_PRODUCTION && pathname.startsWith("/api/")) {
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

      // Specific rate limiting for temp link creation
      if (pathname === "/api/temp/link" && req.method === "POST") {
        const tempLinkResult = await checkTempLinkRateLimit(ip);
        if (!tempLinkResult.success) {
          return createRateLimitResponse(
            "You can only create 2 temporary links at a time. Please wait for some links to expire or create an account for unlimited links.",
            tempLinkResult.limit,
            tempLinkResult.reset,
            tempLinkResult.remaining,
          );
        }
      }
    }

    // Early return for API routes
    if (pathname.startsWith("/api/")) {
      // Add device info headers for non-bot requests
      const data = extractUserAgentData(req);
      const response = addSecurityHeaders(NextResponse.next());
      if (!data.isBot) {
        response.headers.set(
          "x-device-type",
          data.device && typeof data.device === "object"
            ? data.device.type || "desktop"
            : "desktop",
        );
        response.headers.set(
          "x-browser-name",
          data.browser && typeof data.browser === "object"
            ? data.browser.name || "unknown"
            : "unknown",
        );
        response.headers.set(
          "x-browser-version",
          data.browser && typeof data.browser === "object"
            ? data.browser.version || "unknown"
            : "unknown",
        );
        response.headers.set(
          "x-os-name",
          data.os && typeof data.os === "object"
            ? data.os.name || "unknown"
            : "unknown",
        );
        response.headers.set(
          "x-os-version",
          data.os && typeof data.os === "object"
            ? data.os.version || "unknown"
            : "unknown",
        );
      }
      return response;
    }

    // Apply geo and user agent data
    appendGeoAndUserAgent(url, req);

    // Enforce HTTPS in production
    if (IS_PRODUCTION && req.headers.get("x-forwarded-proto") !== "https") {
      const httpsUrl = new URL(req.url);
      httpsUrl.protocol = "https:";
      return addSecurityHeaders(NextResponse.redirect(httpsUrl, 308));
    }

    const hostname = normalizeHostname(req.headers.get("host"));

    // Handle different subdomains
    switch (hostname) {
      case SUBDOMAINS.bio:
        const bioPath = pathname === "/" ? "/bio" : `/bio${pathname}`;
        return addSecurityHeaders(
          NextResponse.rewrite(new URL(`${bioPath}${url.search}`, req.url)),
        );

      case SUBDOMAINS.assets:
        return await handleAssetsSubdomain(pathname, req.url);

      case SUBDOMAINS.app:
        return handleAppSubdomain(url, sessionCookie, req.url);

      case SUBDOMAINS.admin:
        const adminPath = pathname === "/" ? "/admin" : `/admin${pathname}`;
        return addSecurityHeaders(
          NextResponse.rewrite(new URL(`${adminPath}${url.search}`, req.url)),
        );

      case ROOT_DOMAIN:
        return handleRootDomain(url, sessionCookie, ROOT_DOMAIN, req.url, req);

      default:
        return handleCustomDomain(url, hostname, ROOT_DOMAIN, req.url);
    }
  } catch (error: unknown) {
    console.error(
      "Middleware error:",
      error instanceof Error ? error.message : String(error),
    );
    // return addSecurityHeaders(NextResponse.redirect(COMMON_URLS.login));
  }
}

// Handle assets subdomain
async function handleAssetsSubdomain(
  pathname: string,
  baseUrl: string,
): Promise<NextResponse> {
  if (!ASSETS_URL) {
    console.error("NEXT_PUBLIC_ASSETS environment variable not set");
    return NextResponse.rewrite(new URL("/404", baseUrl));
  }

  try {
    const assetUrl = new URL(pathname, ASSETS_URL);
    const response = await fetch(assetUrl.toString(), {
      method: "HEAD",
      cache: "force-cache",
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const contentResponse = await fetch(assetUrl.toString(), {
        cache: "force-cache",
        signal: AbortSignal.timeout(10000),
      });

      return new NextResponse(contentResponse.body, {
        status: contentResponse.status,
        headers: {
          ...Object.fromEntries(contentResponse.headers.entries()),
          "Cache-Control": "public, max-age=31536000, immutable",
          ...SECURITY_HEADERS,
        },
      });
    }
  } catch (error) {
    console.error("Asset fetch error:", error);
  }

  return NextResponse.rewrite(new URL("/404", baseUrl));
}

// Handle app subdomain
async function handleAppSubdomain(
  url: URL,
  token: unknown,
  baseUrl: string,
): Promise<NextResponse<unknown>> {
  const { pathname } = url;

  const authPaths = new Set([
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/app/login",
    "/app/signup",
    "/app/forgot-password",
    "/app/reset-password",
  ]);

  // Redirect authenticated users away from auth pages
  if (token && authPaths.has(pathname)) {
    return addSecurityHeaders(NextResponse.redirect(new URL("/", baseUrl)));
  }

  // Redirect unauthenticated users to login
  if (!token && !isPublicPath(pathname)) {
    return addSecurityHeaders(
      NextResponse.redirect(new URL("/login", baseUrl)),
    );
  }

  // Handle root path
  if (pathname === "/") {
    if (token) {
      return addSecurityHeaders(NextResponse.rewrite(new URL("/app", baseUrl)));
    } else {
      return addSecurityHeaders(
        NextResponse.redirect(new URL("/login", baseUrl)),
      );
    }
  }

  // Handle auth page rewrites
  const authRewrites: Record<string, string> = {
    "/login": "/app/login",
    "/signup": "/app/signup",
    "/forgot-password": "/app/forgot-password",
    "/reset-password": "/app/reset-password",
  };

  if (authRewrites[pathname]) {
    return addSecurityHeaders(
      NextResponse.rewrite(new URL(authRewrites[pathname], baseUrl)),
    );
  }

  // Rewrite authenticated user paths to app directory
  if (token && !pathname.startsWith("/app")) {
    return addSecurityHeaders(
      NextResponse.rewrite(new URL(`/app${pathname}${url.search}`, baseUrl)),
    );
  }

  return addSecurityHeaders(NextResponse.next());
}

// Handle root domain
async function handleRootDomain(
  url: URL,
  token: unknown,
  rootDomain: string,
  baseUrl: string,
  req: NextRequest,
): Promise<NextResponse> {
  const { pathname } = url;
  const shortCode = pathname.slice(1);

  // Redirect authenticated users to app subdomain
  if (pathname === "/" && token) {
    const appUrl = new URL(baseUrl);
    appUrl.hostname = SUBDOMAINS.app;
    return addSecurityHeaders(NextResponse.redirect(appUrl, 307));
  }

  // Skip rewriting for system paths (optimized check)
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".")
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Short link redirection (302) - only process if not public path and not root
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
  rootDomain: string,
  baseUrl: string,
): NextResponse {
  const { pathname } = url;

  // Redirect app paths to app subdomain
  if (pathname.startsWith("/app")) {
    const redirectPath = pathname.replace(/^\/app/, "") || "/";
    return addSecurityHeaders(
      NextResponse.redirect(
        new URL(`https://${SUBDOMAINS.app}${redirectPath}`, baseUrl),
      ),
    );
  }

  // Handle custom domains
  return addSecurityHeaders(
    NextResponse.rewrite(
      new URL(`/${hostname}${pathname}${url.search}`, baseUrl),
    ),
  );
}
