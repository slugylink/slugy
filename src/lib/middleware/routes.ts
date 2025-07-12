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

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() ?? "";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const BASE_URL = IS_PRODUCTION
  ? `https://${ROOT_DOMAIN}`
  : "http://localhost:3000";

export const COMMON_URLS = {
  login: new URL("/login", BASE_URL),
  appLogin: new URL("/app/login", BASE_URL),
  signUp: new URL("/signup", BASE_URL),
  appSignUp: new URL("/app/signup", BASE_URL),
  forgotPassword: new URL("/forget-password", BASE_URL),
  appForgotPassword: new URL("/app/forgot-password", BASE_URL),
  resetPassword: new URL("/reset-password", BASE_URL),
  appResetPassword: new URL("/app/reset-password", BASE_URL),
} as const;

// Pre-computed subdomain patterns for faster lookups
export const SUBDOMAINS = {
  bio: `bio.${ROOT_DOMAIN}`,
  app: `app.${ROOT_DOMAIN}`,
  admin: `admin.${ROOT_DOMAIN}`,
} as const;
