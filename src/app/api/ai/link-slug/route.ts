import { NextResponse } from "next/server";
import { apiSuccess, apiErrors } from "@/lib/api-response";
import {
  GoogleGenerativeAI,
  type GenerationConfig,
} from "@google/generative-ai";

// Initialize the Google Generative AI with API key from environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

// Common stop words to filter out from slugs
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "with", "by", 
  "about", "as", "of", "from", "is", "are", "was", "were", "be", "been", "this", 
  "that", "these", "those", "it", "its"
]);

// Process a string into an SEO-friendly slug with max 25 characters
function processSlug(text: string): string {
  if (!text) return "";

  let slug = text.toLowerCase()
    .split(/\s+/)
    .filter(word => word && !STOP_WORDS.has(word))
    .slice(0, 5)
    .join("-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Limit to 25 characters, cutting at word boundary
  if (slug.length > 25) {
    slug = slug.substring(0, 25);
    const lastHyphenPos = slug.lastIndexOf("-");
    if (lastHyphenPos > 0) {
      slug = slug.substring(0, lastHyphenPos);
    }
  }

  return slug;
}

// Generate SEO-friendly slug using fallback algorithm based only on URL
function generateSeoSlugFallback(url: string): string {
  try {
    let domain = "";
    let pathSegments: string[] = [];

    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname.replace(/^www\./, "").split(".")[0] ?? "";
      pathSegments = urlObj.pathname.split("/").filter(Boolean);
    } catch {
      domain = url.replace(/^https?:\/\//, "").split("/")[0]?.replace(/^www\./, "").split(".")[0] ?? "";
    }

    const candidateSources: string[] = [];

    // Extract from path segments
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1]
        ?.replace(/\.(html|php|aspx|jsp|htm)$/i, "")
        .replace(/-/g, " ");
      if (lastSegment) candidateSources.push(lastSegment);

      if (pathSegments.length > 1) {
        const secondLastSegment = pathSegments[pathSegments.length - 2]
          ?.replace(/\.(html|php|aspx|jsp|htm)$/i, "")
          .replace(/-/g, " ");
        if (secondLastSegment && secondLastSegment !== "index") {
          candidateSources.push(secondLastSegment);
        }
      }
    }

    // Extract from query parameters
    try {
      const urlObj = new URL(url);
      const slugParams = ["title", "name", "id", "slug", "product", "page", "category"];
      
      for (const [key, value] of urlObj.searchParams.entries()) {
        if (slugParams.includes(key.toLowerCase()) && value) {
          candidateSources.push(value.replace(/-/g, " "));
        }
      }
    } catch {
      // Ignore URL parsing errors
    }

    // Add domain and fallback
    if (domain) candidateSources.push(domain);
    candidateSources.push("page");

    // Use first valid source
    for (const source of candidateSources) {
      if (source.trim()) {
        const slug = processSlug(source);
        if (slug) return slug;
      }
    }

    return "page";
  } catch (error) {
    console.error("Error in fallback slug generation:", error);
    return "page";
  }
}

// Build optimized prompt for Gemini
function buildGeminiPrompt(url: string): string {
  return `Generate a short, SEO-friendly URL slug for: ${url}

Requirements:
- 3-25 characters total
- Use hyphens between words
- All lowercase letters and numbers only
- Extract key words from the URL
- Make it memorable and descriptive

Example: "github-discussions-feedback" or "product-page"

Return only the slug, nothing else.`;
}

// LRU Cache implementation for better memory management
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map<K, V>();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value!);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey!);
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }
}

// Cache for slugs to avoid duplicate API calls (limited to 500 entries)
const slugCache = new LRUCache<string, string>(500);

// Generate SEO-friendly slug using Gemini AI
async function generateSeoSlugWithGemini(url: string): Promise<string> {
  try {
    // Check cache first
    if (slugCache.has(url)) {
      const cachedSlug = slugCache.get(url);
      if (cachedSlug) return cachedSlug;
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        topK: 50,
        maxOutputTokens: 30,
      } as GenerationConfig,
    });

    let retries = 2;
    let slug = "";
    let currentPrompt = buildGeminiPrompt(url);

    while (retries >= 0 && !slug) {
      try {
        const result = await model.generateContent(currentPrompt);
        const rawResponse = result.response.text().trim();
        
        console.log("Raw Gemini response:", rawResponse);
        
        slug = rawResponse
          .replace(/^["']|["']$/g, "")
          .split('\n')[0]
          .replace(/^(slug|url|link):\s*/i, "")
          .trim();

        // Validate and clean slug
        if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
          const extractedSlug = slug.match(/[a-z0-9-]+/)?.[0];
          slug = extractedSlug || processSlug(slug);
        }

        if (!slug || slug.length < 3) {
          throw new Error("Generated empty or invalid slug");
        }
      } catch (generationError) {
        console.error(`Gemini generation attempt failed (${retries} retries left):`, generationError);
        retries--;

        if (retries >= 0) {
          currentPrompt = `Create a short URL slug for: ${url}. Use only lowercase letters, numbers, and hyphens. Max 25 characters.`;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    if (slug) {
      slugCache.set(url, slug);
      return slug;
    }

    throw new Error("Failed to generate valid slug after retries");
  } catch (error) {
    console.error("Gemini API error:", error);
    const fallbackSlug = generateSeoSlugFallback(url);
    slugCache.set(url, fallbackSlug);
    return fallbackSlug;
  }
}

// Check if URL exists without parsing content
async function checkUrlExists(url: string): Promise<boolean> {
  try {
    const encodedUrl = encodeURI(url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(encodedUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Range: "bytes=0-1024",
        },
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("URL check failed:", error);
      return false;
    }
  } catch (error) {
    console.error("Error checking URL:", error);
    return false;
  }
}

// Define interface for request body
interface RequestBody {
  url: string;
}

// Main API endpoint handler
export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as RequestBody;

    if (!url) {
      return apiErrors.badRequest("URL is required");
    }

    // Normalize URL
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

    // Validate URL
    try {
      new URL(normalizedUrl);
    } catch {
      return apiErrors.badRequest("Invalid URL format. Please provide a valid URL.");
    }

    const usingGemini = Boolean(process.env.GEMINI_API_KEY);

    // Generate slug and check URL in parallel
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
      },
      undefined,
      200,
      {
        "Cache-Control": "max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return apiErrors.internalError(
      "Failed to analyze URL",
      error instanceof Error ? error.message : String(error),
    );
  }
}
