/**
 * Reformat .env.local into grouped, de-duplicated sections.
 * Preserves values; last definition wins. Writes a timestamped backup first.
 *
 * Usage: npx tsx src/scripts/clean-env.mts [--dry-run]
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(
  process.cwd(),
  process.argv.find((a) => a.startsWith("--file="))?.slice("--file=".length) ||
    ".env.local",
);
const DRY_RUN = process.argv.includes("--dry-run");

/** Section order + membership. Anything unmatched lands in "Other". */
const SECTIONS: Array<{ title: string; keys: string[] }> = [
  {
    title: "Core URLs & Domains",
    keys: [
      "NEXT_PUBLIC_ROOT_DOMAIN",
      "NEXT_PUBLIC_APP_DOMAIN",
      "NEXT_PUBLIC_BASE_URL",
      "NEXT_PUBLIC_APP_URL",
      "NEXT_BASE_URL",
      "NEXT_APP_URL",
      "NEXT_PUBLIC_ASSETS",
      "NEXT_EXPIRATION_URL",
      "NEXT_DOT_URL",
      "CLOUDFLARE_FALLBACK_ORIGIN",
      "CRON_BASE_URL",
      "APP_URL",
    ],
  },
  {
    title: "Database (Postgres / Neon)",
    keys: ["DATABASE_URL", "DATABASE_REPLICA_URL"],
  },
  {
    title: "Auth (Better Auth)",
    keys: [
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
      "EMAIL_VERIFICATION_CALLBACK",
      "LINK_PASSWORD_COOKIE_SECRET",
      "GITHUB_CLIENT_ID",
      "GITHUB_CLIENT_SECRET",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
    ],
  },
  {
    title: "Email (Resend)",
    keys: ["RESEND_API_KEY", "EMAIL_FROM"],
  },
  {
    title: "Billing (Polar)",
    keys: [
      "POLAR_MODE",
      "POLAR_ACCESS_TOKEN",
      "POLAR_WEBHOOK_SECRET",
      "POLAR_PROMO_DISCOUNT_ID",
      "NEXT_PUBLIC_BASIC_PRICE_ID",
      "NEXT_PUBLIC_BASIC_MONTHLY_PRICE_ID",
      "NEXT_PUBLIC_BASIC_YEARLY_PRICE_ID",
      "NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID",
      "NEXT_PUBLIC_PRO_MONTHLY_PRODUCT_ID",
      "NEXT_PUBLIC_PRO_YEARLY_PRICE_ID",
      "NEXT_PUBLIC_BUSINESS_MONTHLY_PRICE_ID",
      "NEXT_PUBLIC_BUSINESS_YEARLY_PRICE_ID",
    ],
  },
  {
    title: "Cache & Queues (Upstash / QStash)",
    keys: [
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "QSTASH_URL",
      "QSTASH_TOKEN",
      "UPSTASH_QSTASH_REST_TOKEN",
      "QSTASH_CURRENT_SIGNING_KEY",
      "QSTASH_NEXT_SIGNING_KEY",
    ],
  },
  {
    title: "Background Jobs (Inngest)",
    keys: ["INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY"],
  },
  {
    title: "Analytics (Tinybird)",
    keys: [
      "TINYBIRD_TOKEN",
      "TINYBIRD_URL",
      "TINYBIRD_API_KEY",
      "TINYBIRD_CLASSIC_TOKEN",
    ],
  },
  {
    title: "AI",
    keys: ["GEMINI_API_KEY", "GEMINI_SLUG_MODEL"],
  },
  {
    title: "Cloudflare (DNS / R2 storage)",
    keys: [
      "CLOUDFLARE_API_URL",
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ZONE_ID",
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_R2_BUCKET_NAME",
      "CLOUDFLARE_R2_ACCESS_KEY_ID",
      "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    ],
  },
  {
    title: "Vercel (custom domains)",
    keys: ["VERCEL_API_URL", "VERCEL_TOKEN", "VERCEL_PROJECT_ID", "VERCEL_TEAM_ID"],
  },
  {
    title: "Link Safety & Misc",
    keys: [
      "GOOGLE_SAFE_BROWSING_API_KEY",
      "GOOGLE_SAFE_BROWSING_CLIENT_ID",
      "DYMO_API_KEY",
      "TOKEN_VALUE",
    ],
  },
  {
    title: "Monitoring (Sentry / APM)",
    keys: [
      "SENTRY_AUTH_TOKEN",
      "APMINSIGHT_LICENSE_KEY",
      "APMINSIGHT_APP_NAME",
      "APMINSIGHT_PORT",
    ],
  },
];

/** Known key renames (old → new). Preserves the value when renaming. */
const RENAMES: Record<string, string> = {
  NEXT_PUBLIC_PRO_MONTHLY_PRODUCT_ID: "NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID",
};

/** Placeholders to ensure exist (empty by default). */
const ENSURE_KEYS = [
  "NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID",
  "NEXT_PUBLIC_PRO_YEARLY_PRICE_ID",
  "NEXT_PUBLIC_BUSINESS_MONTHLY_PRICE_ID",
  "NEXT_PUBLIC_BUSINESS_YEARLY_PRICE_ID",
];

/** Known-unused keys (kept, but sorted last under a warning header). */
const SUSPECTED_UNUSED = new Set([
  "NEXT_PUBLIC_ASSETS",
  "NEXT_EXPIRATION_URL",
  "NEXT_DOT_URL",
  "CLOUDFLARE_API_URL",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ZONE_ID",
  "CLOUDFLARE_FALLBACK_ORIGIN",
  "VERCEL_API_URL",
  "TOKEN_VALUE",
  "APMINSIGHT_LICENSE_KEY",
  "APMINSIGHT_APP_NAME",
  "APMINSIGHT_PORT",
  "SENTRY_AUTH_TOKEN",
]);

function parseEnv(raw: string) {
  const values = new Map<string, string>();
  const order: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (!key) continue;
    // Repair a stray dangling quote (e.g. `KEY="` with no closing quote),
    // which would otherwise be read as part of the value.
    if (value === '"' || value === "'") value = "";
    // Strip a JSON-style trailing semicolon copied along with the value
    // (e.g. `KEY="https://...";`).
    if (value.endsWith(";")) value = value.slice(0, -1).trimEnd();
    if (!values.has(key)) order.push(key);
    // Last non-empty definition wins; don't clobber a real value with "".
    if (value !== "" || !values.has(key)) values.set(key, value);
  }
  return { values, order };
}

function main() {
  if (!existsSync(ENV_PATH)) throw new Error(`Missing ${ENV_PATH}`);
  const raw = readFileSync(ENV_PATH, "utf8");
  const { values, order } = parseEnv(raw);

  // Apply known renames (preserve value, keep position).
  for (const [oldKey, newKey] of Object.entries(RENAMES)) {
    if (values.has(oldKey) && !values.has(newKey)) {
      values.set(newKey, values.get(oldKey)!);
      const idx = order.indexOf(oldKey);
      if (idx >= 0) order[idx] = newKey;
      else order.push(newKey);
      values.delete(oldKey);
      console.log(`[env] Renamed ${oldKey} → ${newKey}`);
    }
  }

  // Ensure expected keys exist (empty placeholders, no value clobbering).
  for (const key of ENSURE_KEYS) {
    if (!values.has(key)) {
      values.set(key, "");
      order.push(key);
      console.log(`[env] Added missing key ${key} (empty)`);
    }
  }

  const assigned = new Set<string>();
  const blocks: string[] = [];

  for (const section of SECTIONS) {
    const present = section.keys.filter((k) => values.has(k));
    if (present.length === 0) continue;
    present.forEach((k) => assigned.add(k));
    blocks.push(
      `# ─────────────────────────────────────────────────────────────\n` +
        `# ${section.title}\n` +
        `# ─────────────────────────────────────────────────────────────\n` +
        present.map((k) => `${k}=${values.get(k)}`).join("\n"),
    );
  }

  const leftover = order.filter((k) => !assigned.has(k));
  if (leftover.length > 0) {
    leftover.forEach((k) => assigned.add(k));
    blocks.push(
      `# ─────────────────────────────────────────────────────────────\n` +
        `# Other\n` +
        `# ─────────────────────────────────────────────────────────────\n` +
        leftover.map((k) => `${k}=${values.get(k)}`).join("\n"),
    );
  }

  const unused = [...assigned].filter((k) => SUSPECTED_UNUSED.has(k));
  const fileName = ENV_PATH.split(/[\\/]/).pop() ?? ".env.local";
  const header =
    `# Slugy — grouped environment (last value wins).\n` +
    `# Duplicates were collapsed. Regenerate with:\n` +
    `#   npx tsx src/scripts/clean-env.mts --file=${fileName}\n` +
    (unused.length > 0
      ? `#\n# Possibly unused (not referenced in src/): ${unused.join(", ")}\n`
      : "");

  const output = `${header}\n${blocks.join("\n\n")}\n`;

  console.log(
    `[env] keys=${values.size} originalLines=${raw.split(/\r?\n/).length} unused=${unused.length}`,
  );

  if (DRY_RUN) {
    console.log("[env] Dry run — no file written.");
    return;
  }

  const backup = `${ENV_PATH}.bak-${Date.now()}`;
  copyFileSync(ENV_PATH, backup);
  writeFileSync(ENV_PATH, output, "utf8");
  console.log(
    `[env] Backup: ${backup}  (NOTE: .bak files are NOT gitignored — move/delete before committing)`,
  );
  console.log("[env] Wrote grouped .env.local");
}

try {
  main();
} catch (error) {
  console.error("[env] Failed:", error);
  process.exit(1);
}
