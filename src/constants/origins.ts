/**
 * Exact origins allowed for auth flows (OAuth callbacks, magic links,
 * session cookies). Exact-match only — never a wildcard — so a compromised
 * subdomain can't mint sessions for the app.
 */
const PROD_ORIGINS = [
  "https://slugy.co",
  "https://app.slugy.co",
  "https://bio.slugy.co",
  "https://admin.slugy.co",
];

const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://app.localhost:3000",
  "http://bio.localhost:3000",
  "http://admin.localhost:3000",
];

/**
 * Vercel preview deployments get a unique exact origin (e.g.
 * https://slugy-git-branch-team.vercel.app) so OAuth/magic-link work on
 * previews without opening auth to every vercel.app subdomain.
 */
function previewOrigin(): string[] {
  const vercelUrl = process.env.VERCEL_URL?.trim();
  return vercelUrl ? [`https://${vercelUrl}`] : [];
}

export const origins = [
  ...PROD_ORIGINS,
  ...previewOrigin(),
  // Localhost entries are harmless in production (exact-match, unreachable
  // from real browsers) and required for `next dev` + subdomains locally.
  ...DEV_ORIGINS,
];
