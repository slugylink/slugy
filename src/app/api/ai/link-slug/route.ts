import { NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  type GenerationConfig,
} from "@google/generative-ai";

// Initialize the Google Generative AI with API key from environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

// Common stop words to filter out from slugs
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

// Process a string into an SEO-friendly slug with max 25 characters
function processSlug(text: string): string {
  if (!text) return "";

  // Convert to lowercase
  let slug = text.toLowerCase();

  // Split into words
  let words = slug.split(/\s+/);

  // Remove stop words and empty items
  words = words.filter((word) => word && !STOP_WORDS.has(word));

  // If no words remain after filtering, return empty to trigger fallback
  if (words.length === 0) return "";

  // Limit to max 5 words for a concise slug
  words = words.slice(0, 5);

  // Join with hyphens
  slug = words.join("-");

  // Remove special characters and replace with hyphens
  slug = slug.replace(/[^a-z0-9-]/g, "-");

  // Remove duplicate hyphens
  slug = slug.replace(/-+/g, "-");

  // Remove leading and trailing hyphens
  slug = slug.replace(/^-|-$/g, "");

  // Limit to 25 characters max
  if (slug.length > 25) {
    slug = slug.substring(0, 25);
    // Ensure we don't cut off in the middle of a word or end with a hyphen
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
    // Handle potentially invalid URLs
    let domain = "";
    let pathSegments: string[] = [];

    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname.replace(/^www\./, "").split(".")[0] ?? "";
      pathSegments = urlObj.pathname.split("/").filter(Boolean);
    } catch (urlError) {
      // If URL parsing fails, do a basic extraction
      console.error("Error parsing URL:", urlError);
      domain =
        url
          .replace(/^https?:\/\//, "")
          .split("/")[0]
          ?.replace(/^www\./, "")
          .split(".")[0] ?? "";
    }

    // Candidate sources for slug in priority order
    const candidateSources: string[] = [];

    // Priority 1: Use URL path
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1]
        ?.replace(/\.(html|php|aspx|jsp|htm)$/i, "")
        .replace(/-/g, " ");
      if (lastSegment) {
        candidateSources.push(lastSegment);
      }

      // If there are multiple path segments, also consider the second-to-last one
      if (pathSegments.length > 1) {
        const secondLastSegment = pathSegments[pathSegments.length - 2]
          ?.replace(/\.(html|php|aspx|jsp|htm)$/i, "")
          .replace(/-/g, " ");
        if (secondLastSegment && secondLastSegment !== "index") {
          candidateSources.push(secondLastSegment);
        }
      }
    }

    // Priority 2: Use query parameters if they exist
    try {
      const urlObj = new URL(url);
      const queryParams = Array.from(urlObj.searchParams.entries());

      // Look for common query parameter names that might contain good slug candidates
      const slugCandidateParams = [
        "title",
        "name",
        "id",
        "slug",
        "product",
        "page",
        "category",
      ];

      for (const [key, value] of queryParams) {
        if (slugCandidateParams.includes(key.toLowerCase()) && value) {
          candidateSources.push(value.replace(/-/g, " "));
        }
      }
    } catch (e) {
      // Ignore URL parsing errors
      console.error("Error parsing URL:", e);
    }

    // Priority 3: Fallback to domain name
    if (domain) {
      candidateSources.push(domain);
    }

    // Final fallback
    candidateSources.push("page");

    // Use the first non-empty source that results in a valid slug
    for (const source of candidateSources) {
      if (source.trim()) {
        const slug = processSlug(source);
        if (slug) return slug;
      }
    }

    // If everything else fails
    return "page";
  } catch (error) {
    console.error("Error in fallback slug generation:", error);
    return "page";
  }
}

// Build optimized prompt for Gemini
function buildGeminiPrompt(url: string): string {
  return `
Generate a short, SEO-friendly URL slug based on this URL: ${url}

Rules:
1. Max 5 words
2. Maximum 25 characters total
3. Use hyphens between words
4. All lowercase
5. No stop words (a, the, and, etc.)
6. Only a-z, 0-9, and hyphens
7. No numbers at beginning
8. No duplicate words
9. Try to extract the most meaningful keywords from the URL

Return ONLY the slug with no explanations.`;
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

    // Get the value and refresh its position in the cache
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value!);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Delete the key first to refresh its position
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // If at capacity, delete the oldest entry (first key in Map)
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
    const cacheKey = url;
    if (slugCache.has(cacheKey)) {
      const cachedSlug = slugCache.get(cacheKey);
      if (cachedSlug) return cachedSlug;
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Build optimized prompt
    const prompt = buildGeminiPrompt(url);

    // Use gemini-1.5-flash for improved performance
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1, // Lower temperature for more consistent results
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 20, // Slug should be very short
      } as GenerationConfig,
    });

    // Generate content with retry logic
    let retries = 2;
    let slug = "";

    while (retries >= 0 && !slug) {
      try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        slug = response.text().trim();

        // Clean up any quotes or extra formatting the AI might add
        slug = slug.replace(/^["']|["']$/g, "").trim();

        // Ensure it follows our slug format rules
        if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
          slug = processSlug(slug);
        }

        // If we still don't have a valid slug, throw to retry or fall back
        if (!slug) throw new Error("Generated empty slug");
      } catch (generationError) {
        console.error(
          `Gemini generation attempt failed (${retries} retries left):`,
          generationError,
        );
        retries--;

        // Short delay before retry
        if (retries >= 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    // If we got a valid slug, cache it
    if (slug) {
      slugCache.set(cacheKey, slug);
      return slug;
    }

    // Fall back if no valid slug after retries
    throw new Error("Failed to generate valid slug after retries");
  } catch (error) {
    console.error("Gemini API error:", error);
    // Fall back to our algorithm if Gemini fails
    const fallbackSlug = generateSeoSlugFallback(url);

    // Cache the fallback result
    const cacheKey = url;
    slugCache.set(cacheKey, fallbackSlug);

    return fallbackSlug;
  }
}

// Check if URL exists without parsing content - with improved error handling
async function checkUrlExists(url: string): Promise<boolean> {
  try {
    // Make sure URL is properly encoded
    const encodedUrl = encodeURI(url);

    const controller = new AbortController();
    // Increase timeout to 8 seconds to handle slower sites
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      // Try GET request first with a small timeout - more reliable than HEAD
      const response = await fetch(encodedUrl, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          // Request only the headers to minimize data transfer
          Range: "bytes=0-1024",
        },
        signal: controller.signal,
        redirect: "follow", // Follow redirects automatically
      });

      // Clear the timeout as we got a response
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      // If the first attempt fails, try a simpler approach
      console.error(
        "First URL check attempt failed, trying fallback method:",
        error,
      );

      // Clear the first timeout
      clearTimeout(timeoutId);

      // Create a new abort controller for the second attempt
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 5000);

      try {
        // Just try to connect without expecting any specific response
        await fetch(encodedUrl, {
          method: "HEAD",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          signal: controller2.signal,
        });

        clearTimeout(timeoutId2);
        return true; // If we get here without an error, the URL exists
      } catch (secondError) {
        clearTimeout(timeoutId2);
        console.error("Second URL check attempt also failed:", secondError);
        return false;
      }
    }
  } catch (error) {
    console.error("Error checking URL:", error);
    // Don't throw, just return false to indicate URL check failed
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
    // Parse request body
    const body: RequestBody = (await req.json()) as RequestBody;
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Normalize URL by prepending https:// if no protocol is present
    const normalizedUrl =
      url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `https://${url}`;

    // Validate the normalized URL
    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        {
          error: "Invalid URL format. Please provide a valid URL.",
        },
        { status: 400 },
      );
    }

    // Check if Gemini API key is available
    const usingGemini = Boolean(process.env.GEMINI_API_KEY);

    // Start URL check and slug generation in parallel for better performance
    const [urlExists, slug] = await Promise.all([
      checkUrlExists(normalizedUrl),
      usingGemini
        ? generateSeoSlugWithGemini(normalizedUrl)
        : generateSeoSlugFallback(normalizedUrl),
    ]);

    // Return successful response
    return NextResponse.json(
      {
        slug,
        urlExists,
        seoOptimized: usingGemini,
        usingGemini,
      },
      {
        headers: {
          "Cache-Control":
            "max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze URL",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
