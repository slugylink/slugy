import { parse } from "node-html-parser";

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

// Cache for parsed HTML to avoid re-parsing
const headNodesCache = new Map<string, HeadNodes>();
const metadataCache = new Map<string, MetadataResult>();

// Cache cleanup to prevent memory leaks
const CACHE_MAX_SIZE = 1000;

function cleanupCache() {
  if (headNodesCache.size > CACHE_MAX_SIZE) {
    const entriesToDelete = [...headNodesCache.keys()].slice(
      0,
      CACHE_MAX_SIZE * 0.2,
    );
    entriesToDelete.forEach((key) => headNodesCache.delete(key));
  }

  if (metadataCache.size > CACHE_MAX_SIZE) {
    const entriesToDelete = [...metadataCache.keys()].slice(
      0,
      CACHE_MAX_SIZE * 0.2,
    );
    entriesToDelete.forEach((key) => metadataCache.delete(key));
  }
}

export const getHtml = async (url: string): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SlugyBot/1.0; +https://slugy.co)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: controller.signal,
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (
      !contentType?.includes("text/html") &&
      !contentType?.includes("application/xhtml+xml")
    ) {
      throw new Error("Not an HTML document");
    }

    return await response.text();
  } catch (error) {
    console.error("Error fetching HTML:", error);
    return null;
  }
};

export const getHeadChildNodes = (html: string): HeadNodes => {
  if (headNodesCache.has(html)) {
    return headNodesCache.get(html)!;
  }

  const ast = parse(html);
  const headElement = ast.querySelector("head") ?? ast;

  const metaTags = Array.from(headElement.querySelectorAll("meta"))
    .map(({ attributes }) => ({
      property: attributes.property ?? attributes.name ?? "",
      content: attributes.content ?? "",
    }))
    .filter(({ property, content }) => property && content);

  const title =
    headElement.querySelector("title")?.text?.trim() ??
    headElement
      .querySelector('meta[property="og:title"]')
      ?.getAttribute("content")
      ?.trim() ??
    headElement
      .querySelector('meta[name="twitter:title"]')
      ?.getAttribute("content")
      ?.trim();

  const linkTags = Array.from(headElement.querySelectorAll("link"))
    .map(({ attributes }) => ({
      rel: attributes.rel ?? "",
      href: attributes.href ?? "",
    }))
    .filter(({ rel, href }) => rel && href);

  const result = { metaTags, title, linkTags };
  headNodesCache.set(html, result);

  // Cleanup cache if needed
  cleanupCache();

  return result;
};

export const getRelativeUrl = (
  baseUrl: string,
  imageUrl: string | null,
): string | null => {
  if (!imageUrl?.trim()) return null;

  try {
    // Check if it's a data URL
    if (imageUrl.startsWith("data:")) return imageUrl;

    // Check if it's already an absolute URL
    if (isValidUrl(imageUrl)) return imageUrl;

    // Handle protocol-relative URLs
    if (imageUrl.startsWith("//")) {
      return `https:${imageUrl}`;
    }

    const base = new URL(baseUrl);
    return new URL(imageUrl, base).toString();
  } catch {
    return null;
  }
};

export const isValidUrl = (str: string): boolean => {
  if (!str?.trim()) return false;
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

const extractMetadata = (
  metadataMap: Map<string, string>,
  titleTag: string | undefined,
  fetchUrl: string,
): MetadataResult => {
  // Extract title with fallbacks
  const title =
    metadataMap.get("og:title") ??
    metadataMap.get("twitter:title") ??
    metadataMap.get("title") ??
    titleTag ??
    new URL(fetchUrl).hostname;

  // Extract description with fallbacks
  const description =
    metadataMap.get("og:description") ??
    metadataMap.get("twitter:description") ??
    metadataMap.get("description") ??
    "No description available";

  // Extract image with fallbacks
  const image =
    metadataMap.get("og:image") ??
    metadataMap.get("twitter:image") ??
    metadataMap.get("image") ??
    metadataMap.get("image_src") ??
    metadataMap.get("icon") ??
    metadataMap.get("shortcut icon");

  return {
    title: title.trim(),
    description: description.trim(),
    image: getRelativeUrl(fetchUrl, image ?? null),
  };
};

export const getMetaTags = async (url: string): Promise<MetadataResult> => {
  if (!isValidUrl(url)) {
    throw new Error("Invalid URL provided");
  }

  // Check cache first
  const cacheKey = url.toLowerCase();
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey)!;
  }

  const fetchMetadata = async (fetchUrl: string): Promise<MetadataResult> => {
    const html = await getHtml(fetchUrl);
    if (!html) {
      return {
        title: new URL(fetchUrl).hostname,
        description: "No description available",
        image: null,
      };
    }

    const { metaTags, title: titleTag, linkTags } = getHeadChildNodes(html);
    const metadataMap = new Map<string, string>();

    // Process meta tags with priority
    metaTags.forEach(({ property, content }) => {
      const prop = property.toLowerCase();

      // Only override if the new tag has higher priority
      const shouldOverride =
        !metadataMap.has(prop) ||
        prop.includes("og:") ||
        prop.includes("twitter:");

      if (shouldOverride) {
        metadataMap.set(prop, content);
      }
    });

    // Process link tags
    linkTags.forEach(({ rel, href }) => {
      if (!metadataMap.has(rel)) {
        metadataMap.set(rel, href);
      }
    });

    return extractMetadata(metadataMap, titleTag, fetchUrl);
  };

  try {
    // First try with the provided URL
    const metadata = await fetchMetadata(url);

    // If no meaningful metadata is found, try the root domain
    if (
      metadata.title === new URL(url).hostname &&
      metadata.description === "No description available" &&
      !metadata.image
    ) {
      const rootDomain = new URL(url).origin;
      if (rootDomain !== url) {
        console.warn(`No metadata found for ${url}. Trying root domain.`);
        const rootMetadata = await fetchMetadata(rootDomain);

        // Cache both results
        metadataCache.set(cacheKey, metadata);
        metadataCache.set(rootDomain.toLowerCase(), rootMetadata);

        return rootMetadata;
      }
    }

    // Cache the result
    metadataCache.set(cacheKey, metadata);

    return metadata;
  } catch (error) {
    console.error("Error in getMetaTags:", error);
    const fallbackMetadata = {
      title: new URL(url).hostname,
      description: "No description available",
      image: null,
    };

    // Cache fallback result
    metadataCache.set(cacheKey, fallbackMetadata);

    return fallbackMetadata;
  }
};
