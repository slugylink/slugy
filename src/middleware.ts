import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { URLRedirects } from "@/lib/middleware/redirection";
import { handleTempRedirect } from "@/lib/middleware/temp-redirect";
import {
  checkRateLimit,
  checkFastRateLimit,
  normalizeIp,
} from "@/lib/middleware/rate-limit";
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

// ───── Helpers ────────────────────────────

const addSecurityHeaders = (res: NextResponse): NextResponse => {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.headers.set(key, value);
  });
  return res;
};

const getClientIP = (req: NextRequest): string => {
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
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

const normalizeHostname = (host: string | null): string =>
  host
    ?.toLowerCase()
    .replace(/\.localhost:3000$/, `.${ROOT_DOMAIN}`)
    .trim() ?? "";

// ───── Middleware ────────────────────────────

export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;
    const url = req.nextUrl.clone();

    // Skip static content early
    if (pathname.startsWith("/_next") || pathname.startsWith("/static")) {
      return NextResponse.next();
    }

    // ───✅ Optimized API Request Pipeline ───
    if (pathname.startsWith("/api/")) {
      if (process.env.NODE_ENV === "development") {
        return addSecurityHeaders(NextResponse.next());
      }

      const clientIP = getClientIP(req);

      // Fast API routes get lightweight limiter
      if (isFastApiRoute(pathname)) {
        const result = checkFastRateLimit(clientIP);
        if (!result.success) {
          return new NextResponse(
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
                "Retry-After": `${Math.ceil(
                  (result.reset - Date.now()) / 1000,
                )}`,
              },
            },
          );
        }
      } else {
        const result = await checkRateLimit(clientIP);
        if (!result.success) {
          return new NextResponse(
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
                "Retry-After": `${Math.ceil(
                  (result.reset - Date.now()) / 1000,
                )}`,
              },
            },
          );
        }
      }

      return addSecurityHeaders(NextResponse.next());
    }

    // ─── Other Middleware Logic for Pages ───
    const token = getSessionCookie(req);

    // ✅ Enforce HTTPS
    if (IS_PRODUCTION && req.headers.get("x-forwarded-proto") !== "https") {
      const httpsURL = new URL(req.url);
      httpsURL.protocol = "https:";
      return redirectTo(httpsURL.toString(), 308);
    }

    const hostname = normalizeHostname(req.headers.get("host"));

    switch (hostname) {
      case SUBDOMAINS.bio: {
        const bioPath = pathname === "/" ? "/bio" : `/bio${pathname}`;
        return rewriteTo(`${bioPath}${url.search}`, req.url);
      }

      case SUBDOMAINS.app:
        return handleAppSubdomain(url, token, req.url);

      case SUBDOMAINS.admin: {
        const adminPath = pathname === "/" ? "/admin" : `/admin${pathname}`;
        return rewriteTo(`${adminPath}${url.search}`, req.url);
      }

      case ROOT_DOMAIN:
        return handleRootDomain(url, token, req);

      default:
        return handleCustomDomain(url, hostname, req.url);
    }
  } catch (err) {
    console.error("Middleware Error:", err);
    return redirectTo("/login");
  }
}

// ───── Domain Handlers ─────────────────────────

async function handleAppSubdomain(
  url: URL,
  token: unknown,
  baseUrl: string,
): Promise<NextResponse> {
  const { pathname, search } = url;

  console.log("🔹 Path:", pathname);
  console.log("🔹 Token:", token ? "✅" : "❌");
  console.log("🔹 Is public:", isPublicPath(pathname));
  console.log("Redirecting to /login from", pathname);


  // 🛑 Authenticated user should not access public auth routes like /login
  if (token && AUTH_PATHS.has(pathname)) {
    return redirectTo(new URL("/", baseUrl).toString());
  }

  // 🛑 Not authenticated and not public path
  // BUT ensure we don’t redirect from `/login` → `/login`
  if (!token && !isPublicPath(pathname)) {
    if (pathname !== "/login") {
      return redirectTo(new URL("/login", baseUrl).toString());
    } else {
      // ✔ /login is public and we're already there → proceed
      return addSecurityHeaders(NextResponse.next());
    }
  }

  // 🛑 Special case: visiting "/" unauthenticated
  // avoid redirect loop if already coming from login
  if (pathname === "/") {
    if (!token) {
      // ✔ handle this explicitly to avoid loops
      return redirectTo(new URL("/login", baseUrl).toString());
    }
    // ✔ token present → go to app
    return rewriteTo("/app", baseUrl);
  }

  // 🔁 Rewrite auth-style internal pages if mapped
  if (AUTH_REWRITES[pathname]) {
    return rewriteTo(AUTH_REWRITES[pathname], baseUrl);
  }

  // 🛑 Authenticated user not on /app → rewrite
  if (token && !pathname.startsWith("/app")) {
    return rewriteTo(`/app${pathname}${search}`, baseUrl);
  }

  // ✅ All good
  return addSecurityHeaders(NextResponse.next());
}

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

  // Short code/temp link redirection
  if (!isPublicPath(pathname) && pathname !== "/" && shortCode.length > 0) {
    if (shortCode.endsWith("&c")) {
      const tempRedirect = await handleTempRedirect(req, shortCode);
      if (tempRedirect) return tempRedirect;
    }

    const redirectResponse = await URLRedirects(req, shortCode);
    if (redirectResponse) return redirectResponse;
  }

  return addSecurityHeaders(NextResponse.next());
}

function handleCustomDomain(
  url: URL,
  hostname: string,
  baseUrl: string,
): NextResponse {
  const { pathname, search } = url;

  if (pathname.startsWith("/app")) {
    const redirectPath = pathname.replace(/^\/app/, "") || "/";
    return redirectTo(`https://${SUBDOMAINS.app}${redirectPath}`);
  }

  return rewriteTo(`/${hostname}${pathname}${search}`, baseUrl);
}
