export const PUBLIC_ROUTES = new Set([
  "/app/login",
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

export const AUTH_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/app/login",
  "/app/signup",
  "/app/forgot-password",
  "/app/reset-password",
]);

export const AUTH_REWRITES: Record<string, string> = {
  "/login": "/app/login",
  "/signup": "/app/signup",
  "/forgot-password": "/app/forgot-password",
  "/reset-password": "/app/reset-password",
};

export const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "on",
  "Cross-Origin-Opener-Policy": "same-origin",
} as const;

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() ?? "";
export const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const SUBDOMAINS = {
  bio: `bio.${ROOT_DOMAIN}`,
  app: `app.${ROOT_DOMAIN}`,
  admin: `admin.${ROOT_DOMAIN}`,
} as const;

export const FAST_API_PATTERNS = [
  /^\/api\/link\/[^\/]+$/,
  /^\/api\/analytics\/track$/,
  /^\/api\/redirect\/[^\/]+$/,
  /^\/api\/metadata$/,
  /^\/api\/rate-limit$/,
];
