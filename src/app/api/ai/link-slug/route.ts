import {
  GoogleGenerativeAI,
  type GenerativeModel,
} from "@google/generative-ai";
import { buildGeminiPrompt } from "@/lib/gemini-ai-slug-prompt";
import { apiErrors, apiSuccess } from "@/lib/api-response";

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "with",
  "by",
  "about",
  "as",
  "of",
  "from",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "www",
  "http",
  "https",
  "com",
  "in",
  "org",
  "net",
  "ref",
  "dp",
  "gp",
]);

/** Structural / tracking path pieces to ignore (Amazon, Flipkart, etc.). */
const JUNK_SEGMENTS = new Set([
  "dp",
  "gp",
  "product",
  "products",
  "item",
  "items",
  "sku",
  "p",
  "pd",
  "b",
  "ref",
  "s",
  "sspa",
  "slredirect",
]);

const FILE_EXTENSIONS = /\.(html|php|aspx|jsp|htm)$/i;
const ASIN_PATTERN = /^b0[a-z0-9]{8}$/i;
const ID_LIKE_PATTERN = /^[a-z]?\d{5,}$/i;
const MAX_SLUG_LENGTH = 20;
const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_WORDS = 5;
/** Prefer lite/stable models first — 3.5-flash often 503s under load. */
const GEMINI_MODELS = [
  process.env.GEMINI_SLUG_MODEL?.trim(),
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
  "gemini-3.5-flash",
].filter(
  (model, index, list): model is string =>
    Boolean(model) && list.indexOf(model) === index,
);
const GEMINI_MAX_RETRIES = 1;
const GEMINI_RETRY_DELAY_MS = 600;

const generationConfig = {
  temperature: 0.3,
  maxOutputTokens: 48,
} as const;

function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

function getGeminiModel(
  client: GoogleGenerativeAI,
  modelName: string,
): GenerativeModel {
  return client.getGenerativeModel({
    model: modelName,
    generationConfig,
  });
}

function isRetryableGeminiError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = (error as { status?: number }).status;
  return status === 429 || status === 503 || status === 500;
}

function geminiErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function detectIntent(url: string): string {
  const u = url.toLowerCase();
  if (
    u.includes("/dp/") ||
    u.includes("/gp/") ||
    u.includes("amazon.") ||
    u.includes("flipkart.") ||
    u.includes("product")
  ) {
    return "product";
  }
  if (u.includes("pricing") || u.includes("plans")) return "pricing";
  if (u.includes("login") || u.includes("signin")) return "auth";
  if (u.includes("signup") || u.includes("register")) return "signup";
  if (u.includes("/docs") || u.includes("documentation")) return "docs";
  if (u.includes("blog") || u.includes("article")) return "blog";
  if (u.includes("dashboard")) return "dashboard";
  return "page";
}

/** Drop query/hash and tracking `/ref=...` path tails so the model sees a clean URL. */
function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    const parts = parsed.pathname.split("/").filter(Boolean);
    while (parts.length > 0) {
      const last = decodeURIComponent(parts[parts.length - 1]!).toLowerCase();
      if (last.startsWith("ref=") || last.startsWith("ref%3d")) {
        parts.pop();
        continue;
      }
      break;
    }
    parsed.pathname = `/${parts.join("/")}`;
    return parsed.toString().replace(/\/$/, "") || parsed.origin;
  } catch {
    return url.split("?")[0]?.split("#")[0] ?? url;
  }
}

function extractDomainLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function extractPathSegments(url: string): string[] {
  try {
    return new URL(url).pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
  } catch {
    return [];
  }
}

function isJunkPathSegment(segment: string): boolean {
  const raw = segment.trim();
  if (!raw) return true;

  const lower = raw.toLowerCase();
  if (JUNK_SEGMENTS.has(lower)) return true;
  if (lower.startsWith("ref=") || lower.includes("=")) return true;
  if (ASIN_PATTERN.test(lower)) return true;
  if (ID_LIKE_PATTERN.test(lower)) return true;
  if (/^[0-9._-]+$/.test(lower)) return true;

  return false;
}

function scorePathSegment(segment: string): number {
  if (isJunkPathSegment(segment)) return -1;

  const cleaned = segment.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (cleaned.length < MIN_SLUG_LENGTH) return -1;

  const words = cleaned.split("-").filter(Boolean);
  let score = cleaned.length;
  score += Math.min(words.length, 6) * 8;
  if (words.length >= 2) score += 20;
  if (words.some((w) => w.length >= 4 && /[a-z]/.test(w))) score += 15;
  if (/^[a-z0-9]+$/i.test(cleaned) && cleaned.length <= 12) score -= 25;

  return score;
}

function pickBestPathLabel(url: string): string | null {
  const segments = extractPathSegments(url);
  let best: { segment: string; score: number } | null = null;

  for (const segment of segments) {
    const score = scorePathSegment(segment);
    if (score < 0) continue;
    if (!best || score > best.score) {
      best = { segment, score };
    }
  }

  // Prefer a clearly descriptive title (multi-word hyphenated) over AI noise.
  if (best && best.score >= 40) {
    return best.segment;
  }

  return best?.segment ?? null;
}

/** Normalize any text into a safe short-link slug. */
function processSlug(text: string): string {
  if (!text.trim()) return "";

  // Keep existing hyphens as word boundaries for titles like Sonata-Analog-...
  const tokens = text
    .toLowerCase()
    .replace(FILE_EXTENSIONS, "")
    .replace(/[_/;,?&+=]+/g, " ")
    .replace(/-+/g, "-")
    .split(/[\s-]+/)
    .map((part) => part.replace(/[^a-z0-9]/g, ""))
    .filter((word) => word && !STOP_WORDS.has(word));

  let slug = tokens.slice(0, MAX_SLUG_WORDS).join("-").replace(/-+/g, "-");

  if (slug.length > MAX_SLUG_LENGTH) {
    const cut = slug.slice(0, MAX_SLUG_LENGTH);
    const lastHyphen = cut.lastIndexOf("-");
    slug = lastHyphen > MIN_SLUG_LENGTH ? cut.slice(0, lastHyphen) : cut;
    slug = slug.replace(/-$/g, "");
  }

  return slug.replace(/^-|-$/g, "");
}

function cleanModelOutput(text: string): string {
  return text
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .split(/\r?\n/)[0]
    .replace(/^(slug|url)\s*[:=]\s*/i, "")
    .trim();
}

function fallbackSlug(url: string): string {
  const label = pickBestPathLabel(url);
  const domain = extractDomainLabel(url);
  return processSlug(label ? label : domain) || "link";
}

async function generateWithGemini(
  cleanUrl: string,
  pathHint: string | null,
): Promise<string | null> {
  const client = getGeminiClient();
  if (!client || GEMINI_MODELS.length === 0) return null;

  const prompt = buildGeminiPrompt(cleanUrl, detectIntent(cleanUrl), pathHint);

  for (const modelName of GEMINI_MODELS) {
    const model = getGeminiModel(client, modelName);

    for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const slug = processSlug(cleanModelOutput(result.response.text()));
        if (slug.length >= MIN_SLUG_LENGTH) return slug;
      } catch (error) {
        const retryable = isRetryableGeminiError(error);
        const message = geminiErrorMessage(error);

        if (retryable) {
          console.warn(
            `[AI slug] ${modelName} unavailable (${(error as { status?: number }).status ?? "retryable"}): trying next`,
          );
        } else {
          console.error(`[AI slug] ${modelName} failed:`, message);
        }

        // Capacity errors → next model immediately; other errors get one short retry.
        if (!retryable && attempt < GEMINI_MAX_RETRIES) {
          await new Promise((resolve) =>
            setTimeout(resolve, GEMINI_RETRY_DELAY_MS * (attempt + 1)),
          );
          continue;
        }
        break;
      }
    }
  }

  return null;
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { url?: unknown };
    const rawUrl = typeof body.url === "string" ? body.url : "";

    if (!rawUrl.trim()) {
      return apiErrors.badRequest("URL is required");
    }

    const url = normalizeUrl(rawUrl);
    if (!isValidHttpUrl(url)) {
      return apiErrors.badRequest("Invalid URL");
    }

    const cleanUrl = canonicalizeUrl(url);
    const pathHint = pickBestPathLabel(cleanUrl);

    // Product titles already in the path are better than model guesses.
    const pathSlug = pathHint ? processSlug(pathHint) : "";
    if (
      pathSlug.length >= MIN_SLUG_LENGTH &&
      scorePathSegment(pathHint!) >= 40
    ) {
      return apiSuccess({ slug: pathSlug }, undefined, 200, {
        "Cache-Control": "private, max-age=300",
      });
    }

    const aiSlug = await generateWithGemini(cleanUrl, pathHint);
    const slug = aiSlug ?? fallbackSlug(cleanUrl);

    return apiSuccess({ slug }, undefined, 200, {
      "Cache-Control": "private, max-age=300",
    });
  } catch (error) {
    console.error("[AI slug] Unexpected error:", error);
    return apiErrors.internalError("Slug generation failed");
  }
}
