"use server";

import { NextResponse } from "next/server";
import { apiSuccess, apiErrors } from "@/lib/api-response";
import {
  GoogleGenerativeAI,
  type GenerationConfig,
} from "@google/generative-ai";
import { buildGeminiPrompt } from "@/lib/gemini-ai-slug-prompt";

/* ============================================================================
 * Types
 * ========================================================================== */

interface RequestBody {
  url: string;
}

interface SlugGenerationResult {
  slug: string;
  urlExists: boolean;
  seoOptimized: boolean;
  usingGemini: boolean;
}

/* ============================================================================
 * Constants
 * ========================================================================== */

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
]);

const FILE_EXTENSIONS = /\.(html|php|aspx|jsp|htm)$/i;
const SLUG_PARAMS = [
  "title",
  "name",
  "id",
  "slug",
  "product",
  "page",
  "category",
];
const VALID_SLUG_PATTERN = /^[a-z0-9-]+$/;

const MAX_SLUG_LENGTH = 25;
const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_WORDS = 4;

const CACHE_SIZE = 500;
const URL_CHECK_TIMEOUT_MS = 8000;

const GEMINI_RETRY_DELAY_MS = 500;
const GEMINI_MAX_RETRIES = 2;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/* ============================================================================
 * LRU Cache
 * ========================================================================== */

class LRUCache<K, V> {
  private capacity: number;
  private cache = new Map<K, V>();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V) {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next()?.value as K;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K) {
    return this.cache.has(key);
  }
}

const slugCache = new LRUCache<string, string>(CACHE_SIZE);

/* ============================================================================
 * Gemini Config
 * ========================================================================== */

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const GEMINI_CONFIG: GenerationConfig = {
  temperature: 0.3,
  topP: 0.9,
  topK: 50,
  maxOutputTokens: 30,
};

/* ============================================================================
 * Slug Helpers
 * ========================================================================== */

function processSlug(text: string): string {
  if (!text) return "";

  let slug = text
    .toLowerCase()
    .replace(FILE_EXTENSIONS, "")
    .split(/[\s/-]+/)
    .filter((w) => w && !STOP_WORDS.has(w))
    .slice(0, MAX_SLUG_WORDS)
    .join("-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (slug.length > MAX_SLUG_LENGTH) {
    slug = slug.slice(0, MAX_SLUG_LENGTH);
    slug = slug.slice(0, slug.lastIndexOf("-") || MAX_SLUG_LENGTH);
  }

  return slug;
}

function cleanGeminiResponse(text: string): string {
  return text
    .replace(/^["']|["']$/g, "")
    .split("\n")[0]
    .replace(/^(slug|url):\s*/i, "")
    .trim();
}

function validateSlug(slug: string): string {
  if (!slug || !VALID_SLUG_PATTERN.test(slug)) {
    return processSlug(slug);
  }
  return slug;
}

/* ============================================================================
 * Intent Detection
 * ========================================================================== */

function detectIntent(url: string): string {
  const u = url.toLowerCase();

  if (u.includes("pricing")) return "pricing";
  if (u.includes("login") || u.includes("signin")) return "auth";
  if (u.includes("signup") || u.includes("register")) return "signup";
  if (u.includes("docs")) return "docs";
  if (u.includes("blog") || u.includes("article")) return "blog";
  if (u.includes("dashboard")) return "dashboard";
  if (u.includes("product")) return "product";

  return "page";
}

/* ============================================================================
 * URL Parsing
 * ========================================================================== */

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  } catch {
    return "";
  }
}

function extractPathSegments(url: string): string[] {
  try {
    return new URL(url).pathname.split("/").filter(Boolean);
  } catch {
    return [];
  }
}

/* ============================================================================
 * Fallback Slug Generator
 * ========================================================================== */

function generateSeoSlugFallback(url: string): string {
  const domain = extractDomain(url);
  const path = extractPathSegments(url).pop() || "";
  const slug = processSlug(`${path} ${domain}`);
  return slug || "page";
}

/* ============================================================================
 * Gemini Slug Generator
 * ========================================================================== */

async function generateSeoSlugWithGemini(url: string): Promise<string> {
  if (slugCache.has(url)) return slugCache.get(url)!;

  const pathSegments = extractPathSegments(url);

  // Cost optimization: skip AI for shallow URLs
  if (pathSegments.length <= 1) {
    const fallback = generateSeoSlugFallback(url);
    slugCache.set(url, fallback);
    return fallback;
  }

  if (!process.env.GEMINI_API_KEY) {
    return generateSeoSlugFallback(url);
  }

  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  let retries = GEMINI_MAX_RETRIES;
  let slug = "";
  const prompt = buildGeminiPrompt(url, detectIntent(url));

  while (retries >= 0 && !slug) {
    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();

      slug = validateSlug(cleanGeminiResponse(raw));

      if (slug.length < MIN_SLUG_LENGTH) throw new Error("Invalid slug");
    } catch {
      retries--;
      if (retries >= 0) {
        await new Promise((r) => setTimeout(r, GEMINI_RETRY_DELAY_MS));
      }
    }
  }

  if (!slug) slug = generateSeoSlugFallback(url);

  slugCache.set(url, slug);
  return slug;
}

/* ============================================================================
 * URL Validation
 * ========================================================================== */

function normalizeUrl(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function checkUrlExists(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), URL_CHECK_TIMEOUT_MS);

    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": USER_AGENT, Range: "bytes=0-512" },
      signal: controller.signal,
    });

    return res.ok;
  } catch {
    return false;
  }
}

/* ============================================================================
 * API Handler
 * ========================================================================== */

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { url } = (await req.json()) as RequestBody;

    if (!url) return apiErrors.badRequest("URL is required");

    const normalizedUrl = normalizeUrl(url);
    if (!isValidUrl(normalizedUrl)) {
      return apiErrors.badRequest("Invalid URL");
    }

    const usingGemini = Boolean(process.env.GEMINI_API_KEY);

    const [urlExists, slug] = await Promise.all([
      checkUrlExists(normalizedUrl),
      usingGemini
        ? generateSeoSlugWithGemini(normalizedUrl)
        : generateSeoSlugFallback(normalizedUrl),
    ]);

    return apiSuccess(
      {
        slug,
        urlExists,
        seoOptimized: usingGemini,
        usingGemini,
      } as SlugGenerationResult,
      undefined,
      200,
      {
        "Cache-Control": "max-age=3600, stale-while-revalidate=86400",
      },
    );
  } catch (err) {
    return apiErrors.internalError("Slug generation failed");
  }
}
