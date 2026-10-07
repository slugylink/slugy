/**
 * Prompt + schema for analytics "Ask AI" (Dub-style NL -> filters).
 * The model only outputs structured filters — it never runs queries itself,
 * so untrusted question text stays in the user message and cannot escape
 * into Tinybird SQL.
 */

export const ANALYTICS_FILTER_KEYS = [
  "slug_key",
  "destination_key",
  "country_key",
  "city_key",
  "continent_key",
  "device_key",
  "browser_key",
  "os_key",
  "referrer_key",
  "trigger_key",
  "domain_key",
] as const;

export type AnalyticsFilterKey = (typeof ANALYTICS_FILTER_KEYS)[number];

export const ANALYTICS_TIME_PERIODS = [
  "24h",
  "7d",
  "30d",
  "3m",
  "12m",
  "all",
] as const;

export type AnalyticsTimePeriod = (typeof ANALYTICS_TIME_PERIODS)[number];

/** Raw trigger values stored on click events -> human labels. */
export const TRIGGER_LABELS: Record<string, string> = {
  qr: "QR scan",
  email: "Email",
  social: "Social",
  campaign: "Campaign",
  direct: "Direct",
  link: "Link",
  api: "API",
};

export function triggerLabel(value: string): string {
  return TRIGGER_LABELS[value.toLowerCase()] ?? value;
}

export interface AskAiContext {
  /** Current time period selected in the dashboard. */
  timePeriod?: string;
  /** Currently applied filters (values joined by comma in UI). */
  currentFilters?: Record<string, string>;
  /** Real dimension values from the loaded analytics (top N). Used for grounding. */
  availableOptions?: Record<string, string[]>;
}

export interface AskAiResult {
  filters: Partial<Record<AnalyticsFilterKey, string[]>>;
  time_period: AnalyticsTimePeriod | null;
  explanation: string;
}

export const ASK_AI_SYSTEM_INSTRUCTION = `You translate a natural-language analytics question into dashboard filters for a link-shortener analytics page.

Allowed filter keys (use ONLY these): slug_key, destination_key, country_key, city_key, continent_key, device_key, browser_key, os_key, referrer_key, trigger_key, domain_key.
Allowed trigger_key values: qr, email, social, campaign, direct, link, api.
Allowed time_period values: 24h, 7d, 30d, 3m, 12m, all. Use null when the question has no time cue AND the dashboard already has a period.

Rules:
- Map synonyms: "mobile" -> device_key ["Mobile"], "desktop" -> device_key ["Desktop"], "US/USA/America" -> country_key ["US"], "UK" -> country_key ["GB"].
- Click source questions go to trigger_key: "QR" / "qr code" / "scans" -> trigger_key ["qr"], "email" / "newsletter" -> ["email"], "social" / named networks (X, Instagram, TikTok...) -> ["social"], "campaign" / "utm" / "ads" -> ["campaign"], "direct" / "typed" / "bookmark" -> ["direct"], "api" -> ["api"].
- Prefer values from AVAILABLE OPTIONS (case-insensitive match). If no close match exists, infer the most likely canonical value (e.g. country names -> ISO codes, "chrome" -> "Chrome", "iphone" -> device Mobile + os iOS) rather than returning empty.
- City questions ("Tokyo users") -> city_key ["Tokyo"]. Continent questions ("Europe") -> continent_key ["Europe"].
- "last quarter" -> time_period "3m". "last month" -> "30d". "last week" -> "7d". "yesterday/today" -> "24h". "last year" -> "12m".
- Never invent a slug_key value unless the question names an explicit slug.
- explanation: one short sentence describing what was applied, or why nothing was applied.

Return ONLY a JSON object with this exact shape:
{"filters": {"country_key": ["US"]}, "time_period": "7d" | null, "explanation": "..."}`;

export function buildAskAiUserInput(
  question: string,
  context: AskAiContext,
): string {
  const lines = [`Question: ${question}`];
  if (context.timePeriod) lines.push(`Current period: ${context.timePeriod}`);
  const current = context.currentFilters
    ? Object.entries(context.currentFilters).filter(([, v]) => v)
    : [];
  if (current.length > 0) {
    lines.push(
      `Current filters: ${current.map(([k, v]) => `${k}=${v}`).join("; ")}`,
    );
  }
  const options = context.availableOptions
    ? Object.entries(context.availableOptions).filter(([, v]) => v.length > 0)
    : [];
  if (options.length > 0) {
    lines.push("AVAILABLE OPTIONS (ground values to these when close):");
    for (const [key, values] of options) {
      lines.push(`- ${key}: ${values.slice(0, 20).join(", ")}`);
    }
  }
  return lines.join("\n");
}

/** Validate + sanitize raw model output so only known keys/periods reach the client. */
export function sanitizeAskAiResult(raw: unknown): AskAiResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const filters: AskAiResult["filters"] = {};
  const rawFilters =
    obj.filters && typeof obj.filters === "object"
      ? (obj.filters as Record<string, unknown>)
      : {};

  for (const key of ANALYTICS_FILTER_KEYS) {
    const value = rawFilters[key];
    if (value == null) continue;
    const arr = (Array.isArray(value) ? value : [value])
      .map((v) => String(v).trim())
      .filter(Boolean)
      .slice(0, 10);
    if (arr.length > 0) filters[key] = arr;
  }

  const tp =
    typeof obj.time_period === "string" &&
    (ANALYTICS_TIME_PERIODS as readonly string[]).includes(obj.time_period)
      ? (obj.time_period as AnalyticsTimePeriod)
      : null;

  const explanation =
    typeof obj.explanation === "string" && obj.explanation.trim()
      ? obj.explanation.trim().slice(0, 300)
      : "Filters applied.";

  return { filters, time_period: tp, explanation };
}
