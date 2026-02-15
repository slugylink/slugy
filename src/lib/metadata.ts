import { parse } from "node-html-parser";

// ============================================================================
// Types
// ============================================================================

interface MetaTag {
  property: string;
  content: string;
}

interface LinkTag {
  rel: string;
  href: string;
}

interface HeadNodes {
  metaTags: MetaTag[];
  title: string | undefined;
  linkTags: LinkTag[];
  bodyText?: string;
}

interface MetadataResult {
  title: string;
  description: string;
  image: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_MAX_SIZE = 1_000;
const CACHE_EVICT_PCT = 0.2;
const REQUEST_TIMEOUT_MS = 10_000; // Increased to 10s
const CACHE_REVALIDATE_SECONDS = 3600;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const ACCEPT_HEADER =
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8";

// ============================================================================
// In-Memory Caches
// ============================================================================

const metadataCache = new Map<string, MetadataResult>();

function cleanupCache(): void {
  const evictCount = Math.floor(CACHE_MAX_SIZE * CACHE_EVICT_PCT);

  if (metadataCache.size > CACHE_MAX_SIZE) {
    const keysToDelete = Array.from(metadataCache.keys()).slice(0, evictCount);
    keysToDelete.forEach((key) => metadataCache.delete(key));
  }
}

// ============================================================================
// URL Utilities
// ============================================================================

export function isValidUrl(str: string): boolean {
  if (!str?.trim()) return false;

  try {
    if (str.startsWith("http://") || str.startsWith("https://")) {
      new URL(str);
      return true;
    }
    return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(str);
  } catch {
    return false;
  }
}

function getSafeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    const match = url.match(/^https?:\/\/([^\/]+)/);
    if (match) return match[1];

    const cleaned = url.replace(/^https?:\/\//, "").split("/")[0];
    return cleaned || "unknown-host";
  }
}

export function getRelativeUrl(
  baseUrl: string,
  imageUrl: string | null,
): string | null {
  if (!imageUrl?.trim()) return null;
  if (imageUrl.startsWith("data:")) return imageUrl;
  if (isValidUrl(imageUrl)) return imageUrl;
  if (imageUrl.startsWith("//")) return `https:${imageUrl}`;

  try {
    return new URL(imageUrl, new URL(baseUrl)).toString();
  } catch {
    return null;
  }
}

// ============================================================================
// HTML Fetching
// ============================================================================

export async function getHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: ACCEPT_HEADER,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
      },
      signal: controller.signal,
      next: { revalidate: CACHE_REVALIDATE_SECONDS },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`HTTP ${response.status} for ${url}`);
      // Don't throw on 4xx/5xx, return null instead
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      console.warn(`Non-HTML content type for ${url}: ${contentType}`);
      return null;
    }

    const html = await response.text();

    // Check if we got valid HTML
    if (!html || html.length < 100) {
      console.warn(`Empty or too short HTML for ${url}`);
      return null;
    }

    return html;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.warn(`Request timeout for ${url}`);
      } else {
        console.warn(`Failed to fetch ${url}: ${error.message}`);
      }
    }
    return null;
  }
}

// ============================================================================
// HTML Parsing - Enhanced
// ============================================================================

function extractFromElement(
  element: any,
  selectors: string[],
): string | undefined {
  for (const selector of selectors) {
    const el = element.querySelector(selector);
    if (el) {
      const content = el.getAttribute("content") || el.textContent || el.text;
      const trimmed = content?.trim();
      if (trimmed && trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return undefined;
}

export function parseMetadata(html: string, baseUrl: string): MetadataResult {
  const hostname = getSafeHostname(baseUrl);

  try {
    const root = parse(html, {
      blockTextElements: {
        script: false,
        noscript: false,
        style: false,
      },
    });

    const head = root.querySelector("head");
    const body = root.querySelector("body");

    // Extract all meta tags
    const metaTags = new Map<string, string>();

    // Get all meta tags
    root.querySelectorAll("meta").forEach((meta) => {
      const property = (
        meta.getAttribute("property") ||
        meta.getAttribute("name") ||
        ""
      ).toLowerCase();
      const content = meta.getAttribute("content");

      if (property && content) {
        // Prioritize og: and twitter: tags
        if (
          !metaTags.has(property) ||
          property.startsWith("og:") ||
          property.startsWith("twitter:")
        ) {
          metaTags.set(property, content);
        }
      }
    });

    // Extract title with multiple fallbacks
    let title: string | undefined;

    // Try meta tags first
    title =
      metaTags.get("og:title") ||
      metaTags.get("twitter:title") ||
      metaTags.get("title");

    // Try title tag
    if (!title && head) {
      const titleEl = head.querySelector("title");
      if (titleEl) {
        title = titleEl.textContent?.trim() || titleEl.text?.trim();
      }
    }

    // Try title tag in root
    if (!title) {
      const titleEl = root.querySelector("title");
      if (titleEl) {
        title = titleEl.textContent?.trim() || titleEl.text?.trim();
      }
    }

    // Try h1 as last resort
    if (!title && body) {
      const h1 = body.querySelector("h1");
      if (h1) {
        title = h1.textContent?.trim() || h1.text?.trim();
      }
    }

    // Extract description
    let description: string | undefined;

    description =
      metaTags.get("og:description") ||
      metaTags.get("twitter:description") ||
      metaTags.get("description");

    // Extract image
    let image: string | null = null;

    const imageCandidates = [
      metaTags.get("og:image"),
      metaTags.get("og:image:url"),
      metaTags.get("og:image:secure_url"),
      metaTags.get("twitter:image"),
      metaTags.get("twitter:image:src"),
    ];

    for (const candidate of imageCandidates) {
      if (candidate) {
        const resolvedImage = getRelativeUrl(baseUrl, candidate);
        if (resolvedImage && resolvedImage.length > 0) {
          image = resolvedImage;
          break;
        }
      }
    }

    // Try link tags for favicon if no image
    if (!image) {
      const linkTags = root.querySelectorAll("link");
      for (const link of linkTags) {
        const rel = (link.getAttribute("rel") || "").toLowerCase();
        const href = link.getAttribute("href");

        if (
          href &&
          (rel.includes("icon") || rel.includes("apple-touch-icon"))
        ) {
          const resolvedImage = getRelativeUrl(baseUrl, href);
          if (resolvedImage) {
            image = resolvedImage;
            break;
          }
        }
      }
    }

    return {
      title: title || hostname,
      description: description || "No description available",
      image,
    };
  } catch (error) {
    console.warn(`Error parsing HTML for ${baseUrl}:`, error);
    return {
      title: hostname,
      description: "No description available",
      image: null,
    };
  }
}

// ============================================================================
// Metadata Fetching
// ============================================================================

async function fetchMetadata(fetchUrl: string): Promise<MetadataResult> {
  const html = await getHtml(fetchUrl);

  if (!html) {
    return {
      title: getSafeHostname(fetchUrl),
      description: "No description available",
      image: null,
    };
  }

  return parseMetadata(html, fetchUrl);
}

function hasMinimalMetadata(
  metadata: MetadataResult,
  hostname: string,
): boolean {
  // Consider metadata sufficient if we have:
  // 1. A title that's different from hostname
  // 2. OR we have a description that's not the default
  // 3. OR we have an image
  return (
    (metadata.title !== hostname && metadata.title.length > 0) ||
    (metadata.description !== "No description available" &&
      metadata.description.length > 0) ||
    metadata.image !== null
  );
}

// ============================================================================
// Public API
// ============================================================================

export async function getMetaTags(url: string): Promise<MetadataResult> {
  // Normalize URL
  const normalizedUrl =
    url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;

  if (!isValidUrl(normalizedUrl)) {
    throw new Error("Invalid URL provided");
  }

  // Check cache
  const cacheKey = normalizedUrl.toLowerCase();
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey)!;
  }

  try {
    const metadata = await fetchMetadata(normalizedUrl);
    const hostname = getSafeHostname(normalizedUrl);

    // If metadata is minimal, try root domain as fallback
    if (!hasMinimalMetadata(metadata, hostname)) {
      try {
        const urlObj = new URL(normalizedUrl);
        const rootDomain = urlObj.origin;

        // Only try root domain if we're on a subpath
        if (
          rootDomain !== normalizedUrl &&
          urlObj.pathname !== "/" &&
          urlObj.pathname !== ""
        ) {
          console.log(
            `Minimal metadata for ${normalizedUrl}. Trying root domain: ${rootDomain}`,
          );

          const rootMeta = await fetchMetadata(rootDomain);

          // Use root metadata if it's better
          if (hasMinimalMetadata(rootMeta, hostname)) {
            metadataCache.set(cacheKey, rootMeta);
            metadataCache.set(rootDomain.toLowerCase(), rootMeta);
            cleanupCache();
            return rootMeta;
          }
        }
      } catch (urlError) {
        console.warn(
          `Failed to try root domain for ${normalizedUrl}:`,
          urlError,
        );
      }
    }

    metadataCache.set(cacheKey, metadata);
    cleanupCache();
    return metadata;
  } catch (error) {
    console.error(`Error in getMetaTags for ${normalizedUrl}:`, error);

    const fallback = {
      title: getSafeHostname(normalizedUrl),
      description: "No description available",
      image: null,
    };

    metadataCache.set(cacheKey, fallback);
    cleanupCache();

    return fallback;
  }
}
