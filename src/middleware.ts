import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { URLRedirects } from "@/lib/middleware/redirection";
import { checkRateLimit, checkFastRateLimit, normalizeIp } from "@/lib/middleware/rate-limit";
import {
  AUTH_PATHS,
  AUTH_REWRITES,
  FAST_API_PATTERNS,
  IS_PRODUCTION,
  PUBLIC_PREFIXES,
  PUBLIC_ROUTES,
  ROOT_DOMAIN,
  SECURITY_HEADERS,
  SUBDOMAINS,
} from "@/lib/middleware/routes";

if (!ROOT_DOMAIN) {
  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_ROOT_DOMAIN",
  );
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
    "/",
  ],
};

// Helper functions
const addSecurityHeaders = (response: NextResponse): NextResponse => {
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    response.headers.set(header, value);
  });
  return response;
};

const getClientIP = (req: NextRequest): string => {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIP = req.headers.get("x-real-ip");
  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  
  const ip = cfConnectingIP || realIP || forwarded?.split(",")[0] || "unknown";
  return normalizeIp(ip);
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

// Hostname:
const normalizeHostname = (host: string | null): string => {
  if (!host) return "";
  return host
    .toLowerCase()
    .replace(/\.localhost:3000$/, `.${ROOT_DOMAIN}`)
    .trim();
};

export async function middleware(req: NextRequest) {
  try {
    const url = req.nextUrl.clone();
    const pathname = url.pathname;

    // Early return for static assets
    if (pathname.startsWith("/_next") || pathname.startsWith("/static")) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      // Skip rate limiting in development mode
      if (process.env.NODE_ENV === "development") {
        return addSecurityHeaders(NextResponse.next());
      }
      
      const clientIP = getClientIP(req);
      
      // Apply rate limiting based on route type
      if (isFastApiRoute(pathname)) {
        const rateLimitResult = checkFastRateLimit(clientIP);
        if (!rateLimitResult.success) {
          return new NextResponse(
            JSON.stringify({ 
              error: "Rate limit exceeded", 
              retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000) 
            }),
            { 
              status: 429, 
              headers: {
                "Content-Type": "application/json",
                "X-RateLimit-Limit": rateLimitResult.limit.toString(),
                "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
                "X-RateLimit-Reset": new Date(rateLimitResult.reset).toISOString(),
                "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
              }
            }
          );
        }
      } else {
        const rateLimitResult = await checkRateLimit(clientIP);
        if (!rateLimitResult.success) {
          return new NextResponse(
            JSON.stringify({ 
              error: "Rate limit exceeded", 
              retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000) 
            }),
            { 
              status: 429, 
              headers: {
                "Content-Type": "application/json",
                "X-RateLimit-Limit": rateLimitResult.limit.toString(),
                "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
                "X-RateLimit-Reset": new Date(rateLimitResult.reset).toISOString(),
                "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
              }
            }
          );
        }
      }
      
      return addSecurityHeaders(NextResponse.next());
    }

    const sessionCookie = getSessionCookie(req);

    // Enforce HTTPS in production
    if (IS_PRODUCTION && req.headers.get("x-forwarded-proto") !== "https") {
      const httpsUrl = new URL(req.url);
      httpsUrl.protocol = "https:";
      return redirectTo(httpsUrl.toString(), 308);
    }

    const hostname = normalizeHostname(req.headers.get("host"));

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

// app subdomain
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

// root domain
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

  // short link redirection:
  if (!isPublicPath(pathname) && pathname !== "/" && shortCode.length > 0) {
    const redirectResponse = await URLRedirects(req, shortCode);
    if (redirectResponse) {
      return redirectResponse;
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

// custom domains
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
