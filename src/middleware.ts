import { type NextRequest, NextResponse, userAgent } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Environment variables
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() ?? "";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Validate critical environment variables
if (!ROOT_DOMAIN) {
  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_ROOT_DOMAIN",
  );
}

// Subdomains
const SUBDOMAINS = {
  bio: `bio.${ROOT_DOMAIN}`,
  app: `app.${ROOT_DOMAIN}`,
  admin: `admin.${ROOT_DOMAIN}`,
} as const;

// Optimize matcher configuration for faster routing
export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
    "/",
  ],
};

// Public routes
const PUBLIC_ROUTES = new Set([
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

const PUBLIC_PREFIXES = [
  "/api/",
  "/api/auth",
  "/api/public",
  "/_next",
  "/static",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
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

// Fast API route patterns
const FAST_API_PATTERNS = [
  /^\/api\/link\/[^\/]+$/,
  /^\/api\/analytics\/track$/,
  /^\/api\/redirect\/[^\/]+$/,
  /^\/api\/metadata$/,
  /^\/api\/rate-limit$/,
];

// Helper functions
const addSecurityHeaders = (response: NextResponse): NextResponse => {
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    response.headers.set(header, value);
  });
  return response;
};

const redirectTo = (url: string, status = 307): NextResponse => {
  return addSecurityHeaders(NextResponse.redirect(new URL(url), status));
};

const rewriteTo = (url: string, baseUrl: string): NextResponse => {
  return addSecurityHeaders(NextResponse.rewrite(new URL(url, baseUrl)));
};

// Path checking
const isPublicPath = (path: string): boolean => {
  if (path.startsWith("/api/")) return true;
  return (
    PUBLIC_ROUTES.has(path) ||
    PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
};

const isFastApiRoute = (pathname: string): boolean => {
  return FAST_API_PATTERNS.some((pattern) => pattern.test(pathname));
};

// Hostname normalization
const normalizeHostname = (host: string | null): string => {
  if (!host) return "";
  return host
    .toLowerCase()
    .replace(/\.localhost:3000$/, `.${ROOT_DOMAIN}`)
    .trim();
};

// Main middleware function
export async function middleware(req: NextRequest) {
  try {
    const url = req.nextUrl.clone();
    const pathname = url.pathname;

    // Early return for static assets
    if (pathname.startsWith("/_next") || pathname.startsWith("/static")) {
      return NextResponse.next();
    }

    // Fast path for API routes
    if (pathname.startsWith("/api/")) {
      if (isFastApiRoute(pathname)) {
        return addSecurityHeaders(NextResponse.next());
      }
      return addSecurityHeaders(NextResponse.next());
    }

    // Get session cookie
    const sessionCookie = getSessionCookie(req);

    // Enforce HTTPS in production
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

  if (token && AUTH_PATHS.has(pathname)) {
    return redirectTo(new URL("/", baseUrl).toString());
  }

  if (!token && !isPublicPath(pathname)) {
    return redirectTo(new URL("/login", baseUrl).toString());
  }

  if (pathname === "/") {
    return token
      ? rewriteTo("/app", baseUrl)
      : redirectTo(new URL("/login", baseUrl).toString());
  }

  if (AUTH_REWRITES[pathname]) {
    return rewriteTo(AUTH_REWRITES[pathname], baseUrl);
  }

  if (token && !pathname.startsWith("/app")) {
    return rewriteTo(`/app${pathname}${url.search}`, baseUrl);
  }

  return addSecurityHeaders(NextResponse.next());
}

// Handle root domain
async function handleRootDomain(
  url: URL,
  token: unknown,
  req: NextRequest,
): Promise<NextResponse> {
  const { pathname } = url;
  const shortCode = pathname.slice(1);

  if (pathname === "/" && token) {
    const appUrl = new URL(req.url);
    appUrl.hostname = SUBDOMAINS.app;
    return redirectTo(appUrl.toString());
  }

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".")
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Short link redirection - delegate to API
  if (!isPublicPath(pathname) && pathname !== "/") {
    try {
      const response = await fetch(
        `${req.nextUrl.origin}/api/link/${shortCode}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(req.headers.get("cookie") && {
              Cookie: req.headers.get("cookie")!,
            }),
          },
        },
      );

      if (response.ok) {
        const linkData = await response.json();
        if (linkData.success && linkData.url && !linkData.requiresPassword) {
          // Track analytics in background for successful redirects
          const ua = userAgent(req);
          if (linkData.linkId) {
            const analyticsData = {
              ipAddress:
                req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
                "Unknown",
              country: req.headers.get("x-vercel-ip-country") ?? undefined,
              city: req.headers.get("x-vercel-ip-city") ?? undefined,
              continent: req.headers.get("x-vercel-ip-continent") ?? undefined,
              referer: req.headers.get("referer") ?? undefined,
              device: ua.device.type ?? "Desktop",
              browser: ua.browser.name ?? "unknown",
              os: ua.os.name ?? "unknown",
            };

            fetch(`${req.nextUrl.origin}/api/analytics/track`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                linkId: linkData.linkId,
                slug: shortCode,
                analyticsData,
              }),
            })
              .then((response) => {
                if (!response.ok) {
                  console.error(
                    "Analytics tracking failed:",
                    response.status,
                    response.statusText,
                  );
                }
              })
              .catch((error) => {
                console.error("Analytics tracking failed:", error);
              });
          }

          return NextResponse.redirect(new URL(linkData.url), 302);
        }
      }
    } catch (error) {
      console.error("Link redirect error:", error);
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

  if (pathname.startsWith("/app")) {
    const redirectPath = pathname.replace(/^\/app/, "") || "/";
    return redirectTo(`https://${SUBDOMAINS.app}${redirectPath}`);
  }

  return rewriteTo(`/${hostname}${pathname}${url.search}`, baseUrl);
}
