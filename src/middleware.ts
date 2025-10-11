import { type NextRequest, NextResponse } from "next/server";
import { URLRedirects } from "@/lib/middleware/redirection";
import { handleTempRedirect } from "@/lib/middleware/temp-redirect";
import { getCachedSession } from "@/lib/middleware/get-sesstion";
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

// const isAppPath = (path: string): boolean => path.startsWith("/app");

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

const rateLimitExceededResponse = (result: RateLimitResult) =>
  addSecurityHeaders(
    // FIXED: Added security headers
    new NextResponse(
      JSON.stringify({
        error: "Rate limit exceeded",
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": new Date(result.reset).toISOString(),
          "Retry-After": `${Math.ceil((result.reset - Date.now()) / 1000)}`,
        },
      },
    ),
  );

//─────────── Main Middleware ───────────

export async function middleware(req: NextRequest): Promise<NextResponse> {
  try {
    const { pathname } = req.nextUrl;
    const url = req.nextUrl.clone();

    // Early return for static assets and common files
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/static") ||
      pathname === "/favicon.ico" ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml" ||
      pathname === "/manifest.webmanifest" ||
      pathname.startsWith("/images/") ||
      pathname.startsWith("/icons/") ||
      /\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|webp|avif)$/.test(pathname)
    ) {
      return NextResponse.next();
    }

    const hostname = normalizeHostname(req.headers.get("host"));

    // API Routes handling (skip rate limiting for now on custom domains)
    if (pathname.startsWith("/api/")) {
      const clientIP = getClientIP(req);
      const isFastUser = isFastApiRoute(pathname);

      // Only apply rate limiting for known domains, not custom domains
      const isKnownDomain = hostname === ROOT_DOMAIN || 
                           hostname === SUBDOMAINS.bio || 
                           hostname === SUBDOMAINS.app || 
                           hostname === SUBDOMAINS.admin;

      if (process.env.NODE_ENV !== "development" && isKnownDomain) {
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

      case SUBDOMAINS.app: {
        const { token } = await getCachedSession(req);
        return handleAppSubdomain(url, token, req.url);
      }

      case SUBDOMAINS.admin: {
        const adminPath = pathname === "/" ? "/admin" : `/admin${pathname}`;
        return rewriteTo(`${adminPath}${url.search}`, req.url);
      }

      case ROOT_DOMAIN: {
        const { token } = await getCachedSession(req);
        return handleRootDomain(url, token, req);
      }

      default:
        return handleCustomDomain(url, hostname, req.url, req);
    }
  } catch (err) {
    console.error("Middleware Error:", err);
    return addSecurityHeaders(
      NextResponse.redirect(new URL("/login", req.url)),
    ); // FIXED: Better error handling
  }
}

//─────────── Subdomain Handlers ───────────

function handleAppSubdomain(
  url: URL,
  token: unknown,
  baseUrl: string,
): NextResponse {
  const { pathname, search } = url;

  const isAuthenticated = Boolean(token);
  const prefixedPath = `/app${pathname}${search}`;
  const isAlreadyInApp = pathname.startsWith("/app");
  const isAuthPage = AUTH_PATHS.has(pathname);

  // Handle root path
  if (pathname === "/") {
    const redirectPath = isAuthenticated ? "/app" : "/login";
    return addSecurityHeaders(
      NextResponse.redirect(new URL(redirectPath, baseUrl)),
    );
  }

  // Auth-related paths
  if (isAuthPage) {
    // Redirect authenticated users away from login/signup
    if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
      return addSecurityHeaders(NextResponse.redirect(new URL("/", baseUrl)));
    }

    // Rewrite public auth paths to /app/* equivalents
    if (!isAlreadyInApp) {
      return addSecurityHeaders(
        NextResponse.rewrite(new URL(prefixedPath, baseUrl)),
      );
    }

    // Allow access to valid /app/* auth routes
    return addSecurityHeaders(NextResponse.next());
  }

  // Protect private routes: Require authentication
  if (!isPublicPath(pathname) && !isAuthenticated) {
    return addSecurityHeaders(
      NextResponse.redirect(new URL("/app/login", baseUrl)),
    );
  }

  // Rewrite everything else to /app/* unless already prefixed
  if (!isAlreadyInApp) {
    return addSecurityHeaders(
      NextResponse.rewrite(new URL(prefixedPath, baseUrl)),
    );
  }

  return addSecurityHeaders(NextResponse.next());
}

async function handleRootDomain(
  url: URL,
  token: unknown,
  req: NextRequest,
): Promise<NextResponse> {
  const { pathname } = url;
  const shortCode = pathname.slice(1);

  // Redirect logged-in root user to app
  if (pathname === "/" && token) {
    const appUrl = new URL(req.url);
    appUrl.hostname = SUBDOMAINS.app;
    return redirectTo(appUrl.toString());
  }

  // Skip assets/static - FIXED: Better asset detection
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest.webmanifest") ||
    /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/.test(pathname)
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  if (!isPublicPath(pathname) && pathname !== "/" && shortCode.length > 0) {
    // Handle /abc&c temp redirect
    if (shortCode.endsWith("&c")) {
      const tempRedirect = await handleTempRedirect(req, shortCode);
      if (tempRedirect) return tempRedirect;
    }

    const redirectResponse = await URLRedirects(req, shortCode);
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
  const { pathname, search } = url;

  // Redirect /app paths on custom domains to app subdomain
  if (pathname.startsWith("/app")) {
    const redirectPath = pathname.replace(/^\/app/, "") || "/";
    return redirectTo(`https://${SUBDOMAINS.app}${redirectPath}${search}`);
  }

  // Root path on custom domain - show a default page or redirect
  if (pathname === "/") {
    // You can customize this behavior
    // Option 1: Show a custom page
    // return rewriteTo(`/custom-domain-home`, baseUrl);
    // Option 2: Return a 404
    return new NextResponse("Domain configured successfully. Add a slug to create a short link.", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  // Check if this is a verified custom domain and handle link redirection
  try {
    const customDomainResponse = await handleCustomDomainRequest(req, hostname);
    if (customDomainResponse) {
      return customDomainResponse;
    }
  } catch (error) {
    console.error("Error handling custom domain request:", error);
    // Continue to fallback
  }

  // Fallback: show 404 
  return new NextResponse("Link not found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
