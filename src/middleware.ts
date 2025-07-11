import { type NextRequest, NextResponse, userAgent } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export const config = {
  matcher: [
    "/",
    "/((?!_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
    "/api/:path*",
    "/api/auth/:path*",
    "/api/workspace/:path*",
  ],
};

const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "on",
  "Cross-Origin-Opener-Policy": "same-origin",
} as const;

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() ?? "";
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET?.trim();
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ASSETS_URL = process.env.NEXT_PUBLIC_ASSETS?.trim();

if (!ROOT_DOMAIN || !BETTER_AUTH_SECRET) {
  throw new Error("Missing required environment variables");
}

const BOT_REGEX = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Pinterest|vkShare|redditbot|Applebot|WhatsApp|TelegramBot|Discordbot|Slackbot|Viber|Microlink|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou|Exabot|Thunderbird|Outlook-iOS|Outlook-Android|Feedly|Feedspot|Feedbin|NewsBlur|ia_archiver|archive\.org_bot|Uptimebot|Monitis|NewRelicPinger|Postman|insomnia|HeadlessChrome|bot|chatgpt|bluesky|bing|duckduckbot|yandex|baidu|teoma|slurp|MetaInspector|iframely|spider|Go-http-client|preview|prerender|msn/i;

const PUBLIC_ROUTES = new Set([
  "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email",
  "/terms", "/privacy", "/404", "/500", "/not-found", "/onboarding",
  "/onboarding/welcome", "/pricing", "/features", "/about", "/contact", "/blog"
]);

const PUBLIC_PREFIXES = ["/api/", "/api/auth", "/api/public", "/_next", "/static", "/favicon.ico", "/robots.txt", "/sitemap.xml"];

const SUBDOMAINS = {
  bio: `bio.${ROOT_DOMAIN}`,
  assets: `assets.${ROOT_DOMAIN}`,
  app: `app.${ROOT_DOMAIN}`,
  admin: `admin.${ROOT_DOMAIN}`,
};

const pathCache = new Map<string, boolean>();
const hostCache = new Map<string, string>();

const isPublicPath = (path: string): boolean => {
  if (pathCache.has(path)) return pathCache.get(path)!;
  const isPublic = PUBLIC_ROUTES.has(path) || PUBLIC_PREFIXES.some(p => path.startsWith(p));
  if (pathCache.size < 1000) pathCache.set(path, isPublic);
  return isPublic;
};

const normalizeHostname = (host: string | null): string => {
  if (!host) return "";
  if (hostCache.has(host)) return hostCache.get(host)!;
  const normalized = host.toLowerCase().replace(/\.localhost:3000$/, `.${ROOT_DOMAIN}`).trim();
  if (hostCache.size < 100) hostCache.set(host, normalized);
  return normalized;
};

const normalizeIp = (ip: string): string => {
  return ip.includes(":") ? ip.split(":").slice(0, 4).join(":") : ip;
};

const isBot = (req: NextRequest): boolean => {
  const ua = req.headers.get("user-agent")?.toLowerCase() ?? "";
  return BOT_REGEX.test(ua) || (userAgent(req).isBot ?? false);
};

const extractUserData = (req: NextRequest) => {
  const ua = userAgent(req);
  return {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "Unknown",
    country: req.headers.get("x-vercel-ip-country"),
    city: req.headers.get("x-vercel-ip-city"),
    region: req.headers.get("x-vercel-ip-country-region"),
    continent: req.headers.get("x-vercel-ip-continent"),
    referer: req.headers.get("referer"),
    device: ua.device?.type ?? "desktop",
    browser: ua.browser?.name ?? "chrome",
    os: ua.os?.name ?? "windows",
    isBot: isBot(req)
  };
};

const addHeaders = (response: NextResponse): NextResponse => {
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
  return response;
};

const createRateLimitResponse = (error: string, limit: number, reset: number, remaining: number): NextResponse => {
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

const checkRateLimit = async (ip: string) => {
  return { success: true, limit: 100, reset: Date.now() + 60000, remaining: 99 };
};

const URLRedirects = async (shortCode: string, userData: ReturnType<typeof extractUserData>) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/api/redirect/${shortCode}`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "x-device-type": userData.device,
        "x-browser-name": userData.browser,
        "x-os-name": userData.os,
        "x-is-bot": userData.isBot.toString()
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.url;
    }
    
    return `${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/`;
  } catch (error) {
    console.error("Link error:", error);
    return `${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/`;
  }
};

export async function middleware(req: NextRequest) {
  try {
    const url = req.nextUrl.clone();
    const pathname = url.pathname;

    if (pathname.startsWith("/_next") || pathname.startsWith("/static")) {
      return NextResponse.next();
    }

    const sessionCookie = getSessionCookie(req);

    if (IS_PRODUCTION && pathname.startsWith("/api/")) {
      const ip = normalizeIp(req.headers.get("x-forwarded-for") ?? "unknown");
      const { success, limit, reset, remaining } = await checkRateLimit(ip);
      if (!success) {
        return createRateLimitResponse("Too many requests", limit, reset, remaining);
      }
    }

    // Extract user data once and reuse
    const userData = extractUserData(req);

    if (pathname.startsWith("/api/")) {
      const response = addHeaders(NextResponse.next());
      if (!userData.isBot) {
        response.headers.set("x-device-type", userData.device);
        response.headers.set("x-browser-name", userData.browser);
        response.headers.set("x-os-name", userData.os);
      }
      return response;
    }

    // Add URL parameters for tracking
    const params = url.searchParams;
    params.set("isMetadataPreview", userData.isBot.toString());
    if (!userData.isBot) {
      params.set("ipAddress", userData.ip);
      params.set("country", userData.country ?? "Unknown");
      params.set("city", userData.city ?? "Unknown");
      params.set("region", userData.region ?? "Unknown");
      params.set("continent", userData.continent ?? "Unknown");
      params.set("referer", userData.referer ?? "direct");
      params.set("device", userData.device);
      params.set("browser", userData.browser);
      params.set("os", userData.os);
    }

    if (IS_PRODUCTION && req.headers.get("x-forwarded-proto") !== "https") {
      const httpsUrl = new URL(req.url);
      httpsUrl.protocol = "https:";
      return addHeaders(NextResponse.redirect(httpsUrl, 308));
    }

    const hostname = normalizeHostname(req.headers.get("host"));

    switch (hostname) {
      case SUBDOMAINS.bio:
        const bioPath = pathname === "/" ? "/bio" : `/bio${pathname}`;
        return addHeaders(NextResponse.rewrite(new URL(`${bioPath}${url.search}`, req.url)));

      case SUBDOMAINS.assets:
        if (!ASSETS_URL) return addHeaders(NextResponse.rewrite(new URL("/404", req.url)));
        try {
          const assetUrl = new URL(pathname, ASSETS_URL);
          const response = await fetch(assetUrl.toString(), { method: "HEAD", cache: "force-cache", signal: AbortSignal.timeout(5000) });
          if (response.ok) {
            const contentResponse = await fetch(assetUrl.toString(), { cache: "force-cache", signal: AbortSignal.timeout(10000) });
            return new NextResponse(contentResponse.body, {
              status: contentResponse.status,
              headers: { ...Object.fromEntries(contentResponse.headers.entries()), "Cache-Control": "public, max-age=31536000, immutable", ...SECURITY_HEADERS }
            });
          }
        } catch (error) {
          console.error("Asset error:", error);
        }
        return addHeaders(NextResponse.rewrite(new URL("/404", req.url)));

      case SUBDOMAINS.app:
        const authPaths = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/app/login", "/app/signup", "/app/forgot-password", "/app/reset-password"]);
        if (sessionCookie && authPaths.has(pathname)) {
          return addHeaders(NextResponse.redirect(new URL("/", req.url)));
        }
        if (!sessionCookie && !isPublicPath(pathname)) {
          return addHeaders(NextResponse.redirect(new URL("/login", req.url)));
        }
        if (pathname === "/") {
          return addHeaders(NextResponse.redirect(new URL(sessionCookie ? "/app" : "/login", req.url)));
        }
        const authRewrites: Record<string, string> = { "/login": "/app/login", "/signup": "/app/signup", "/forgot-password": "/app/forgot-password", "/reset-password": "/app/reset-password" };
        if (authRewrites[pathname]) {
          return addHeaders(NextResponse.rewrite(new URL(authRewrites[pathname], req.url)));
        }
        if (sessionCookie && !pathname.startsWith("/app")) {
          return addHeaders(NextResponse.rewrite(new URL(`/app${pathname}${url.search}`, req.url)));
        }
        return addHeaders(NextResponse.next());

      case SUBDOMAINS.admin:
        const adminPath = pathname === "/" ? "/admin" : `/admin${pathname}`;
        return addHeaders(NextResponse.rewrite(new URL(`${adminPath}${url.search}`, req.url)));

      case ROOT_DOMAIN:
        const shortCode = pathname.slice(1);
        if (pathname === "/" && sessionCookie) {
          const appUrl = new URL(req.url);
          appUrl.hostname = SUBDOMAINS.app;
          return addHeaders(NextResponse.redirect(appUrl, 307));
        }
        if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.startsWith("/static/") || pathname.includes(".")) {
          return addHeaders(NextResponse.next());
        }
        if (!isPublicPath(pathname) && pathname !== "/") {
          const destination = await URLRedirects(shortCode, userData);
          if (destination) {
            return NextResponse.redirect(new URL(destination), 302);
          }
        }
        return addHeaders(NextResponse.next());

      default:
        if (pathname.startsWith("/app")) {
          const redirectPath = pathname.replace(/^\/app/, "") || "/";
          return addHeaders(NextResponse.redirect(new URL(`https://${SUBDOMAINS.app}${redirectPath}`, req.url)));
        }
        return addHeaders(NextResponse.rewrite(new URL(`/${hostname}${pathname}${url.search}`, req.url)));
    }
  } catch (error: unknown) {
    console.error("Middleware error:", error instanceof Error ? error.message : String(error));
  }
}
