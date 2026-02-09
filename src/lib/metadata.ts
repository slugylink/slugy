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
const REQUEST_TIMEOUT_MS = 5_000;
const CACHE_REVALIDATE_SECONDS = 3600;

const USER_AGENT = "Mozilla/5.0 (compatible; SlugyBot/1.0; +https://slugy.co)";
const ACCEPT_HEADER = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

// ============================================================================
// In-Memory Caches
// ============================================================================

const headNodesCache = new Map<string, HeadNodes>();
const metadataCache = new Map<string, MetadataResult>();

function cleanupCache(): void {
  const evictCount = Math.floor(CACHE_MAX_SIZE * CACHE_EVICT_PCT);

  if (headNodesCache.size > CACHE_MAX_SIZE) {
    const keysToDelete = Array.from(headNodesCache.keys()).slice(0, evictCount);
    keysToDelete.forEach(key => headNodesCache.delete(key));
  }

  if (metadataCache.size > CACHE_MAX_SIZE) {
    const keysToDelete = Array.from(metadataCache.keys()).slice(0, evictCount);
    keysToDelete.forEach(key => metadataCache.delete(key));
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
    // Basic domain validation (with optional path)
    return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(str);
  } catch {
    return false;
  }
}

function getSafeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    // Fallback parsing for malformed URLs
    const match = url.match(/^https?:\/\/([^\/]+)/);
    if (match) return match[1];
    
    const cleaned = url.replace(/^https?:\/\//, '').split('/')[0];
    return cleaned || 'unknown-host';
  }
}

export function getRelativeUrl(baseUrl: string, imageUrl: string | null): string | null {
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
        "Accept": ACCEPT_HEADER,
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: controller.signal,
      next: { revalidate: CACHE_REVALIDATE_SECONDS },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml\+xml/.test(contentType)) {
      throw new Error("Not an HTML document");
    }

    return await response.text();
    
  } catch (error) {
    if (error instanceof Error) {
      switch (true) {
        case error.name === 'AbortError':
          console.warn(`Request timeout for ${url}`);
          break;
        case error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo'):
          console.warn(`DNS resolution failed for ${url}`);
          break;
        case error.message.includes('ECONNREFUSED'):
          console.warn(`Connection refused for ${url}`);
          break;
        default:
          console.warn(`Failed to fetch ${url}: ${error.message}`);
      }
    } else {
      console.warn(`Unknown error fetching ${url}:`, error);
    }
    return null;
  }
}

// ============================================================================
// HTML Parsing
// ============================================================================

export function getHeadChildNodes(html: string): HeadNodes {
  if (headNodesCache.has(html)) {
    return headNodesCache.get(html)!;
  }

  const ast = parse(html);
  const head = ast.querySelector("head") || ast;

  // Extract meta tags
  const metaTags = head
    .querySelectorAll("meta")
    .map(m => {
      const { property, name, content } = m.attributes;
      return {
        property: property ?? name ?? "",
        content: content ?? "",
      };
    })
    .filter(({ property, content }) => property && content);

  // Extract title (with fallbacks)
  const title =
    head.querySelector("title")?.text?.trim() ||
    head.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim() ||
    head.querySelector('meta[name="twitter:title"]')?.getAttribute("content")?.trim();

  // Extract link tags
  const linkTags = head
    .querySelectorAll("link")
    .map(l => {
      const { rel, href } = l.attributes;
      return { rel: rel ?? "", href: href ?? "" };
    })
    .filter(({ rel, href }) => rel && href);

  const nodes = { metaTags, title, linkTags };
  headNodesCache.set(html, nodes);
  cleanupCache();
  
  return nodes;
}

// ============================================================================
// Metadata Extraction
// ============================================================================

function extractMetadata(
  metaMap: Map<string, string>,
  titleTag: string | undefined,
  url: string,
): MetadataResult {
  const fallbackTitle = getSafeHostname(url);

  const title =
    metaMap.get("og:title") ||
    metaMap.get("twitter:title") ||
    metaMap.get("title") ||
    titleTag ||
    fallbackTitle;

  const description =
    metaMap.get("og:description") ||
    metaMap.get("twitter:description") ||
    metaMap.get("description") ||
    "No description available";

  const image =
    metaMap.get("og:image") ||
    metaMap.get("twitter:image") ||
    metaMap.get("image") ||
    metaMap.get("image_src") ||
    metaMap.get("icon") ||
    metaMap.get("shortcut icon");

  return {
    title: title.trim(),
    description: description.trim(),
    image: getRelativeUrl(url, image ?? null),
  };
}

async function fetchMetadata(fetchUrl: string): Promise<MetadataResult> {
  const html = await getHtml(fetchUrl);
  
  if (!html) {
    return {
      title: getSafeHostname(fetchUrl),
      description: "No description available",
      image: null,
    };
  }

  const { metaTags, title: titleTag, linkTags } = getHeadChildNodes(html);
  const metaMap = new Map<string, string>();

  // Populate meta map with priority to OG and Twitter tags
  for (const { property, content } of metaTags) {
    const key = property.toLowerCase();
    const shouldOverride =
      !metaMap.has(key) || 
      key.includes("og:") || 
      key.includes("twitter:");
    
    if (shouldOverride) {
      metaMap.set(key, content);
    }
  }

  // Add link tags to meta map
  for (const { rel, href } of linkTags) {
    if (!metaMap.has(rel)) {
      metaMap.set(rel, href);
    }
  }

  return extractMetadata(metaMap, titleTag, fetchUrl);
}

function createFallbackMetadata(url: string): MetadataResult {
  return {
    title: getSafeHostname(url),
    description: "No description available",
    image: null,
  };
}

function isEmptyMetadata(metadata: MetadataResult, hostname: string): boolean {
  return (
    metadata.title === hostname &&
    metadata.description === "No description available" &&
    !metadata.image
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

    // If metadata is empty, try root domain as fallback
    if (isEmptyMetadata(metadata, hostname)) {
      try {
        const rootDomain = new URL(normalizedUrl).origin;
        
        if (rootDomain !== normalizedUrl) {
          console.warn(`No metadata found for ${normalizedUrl}. Trying root domain.`);
          const rootMeta = await fetchMetadata(rootDomain);
          
          // Cache both results
          metadataCache.set(cacheKey, metadata);
          metadataCache.set(rootDomain.toLowerCase(), rootMeta);
          
          return rootMeta;
        }
      } catch (urlError) {
        console.warn(`Failed to parse root domain for ${normalizedUrl}:`, urlError);
      }
    }

    metadataCache.set(cacheKey, metadata);
    return metadata;
    
  } catch (error) {
    console.warn(`Error in getMetaTags for ${normalizedUrl}:`, error);
    
    const fallback = createFallbackMetadata(normalizedUrl);
    metadataCache.set(cacheKey, fallback);
    
    return fallback;
  }
}