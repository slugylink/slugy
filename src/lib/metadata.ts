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

const CACHE_MAX_SIZE = 1_000;
const CACHE_EVICT_PCT = 0.2; // Evict 20% when over limit

const headNodesCache = new Map<string, HeadNodes>();
const metadataCache = new Map<string, MetadataResult>();

function cleanupCache() {
  if (headNodesCache.size > CACHE_MAX_SIZE) {
    for (const key of Array.from(headNodesCache.keys()).slice(
      0,
      CACHE_MAX_SIZE * CACHE_EVICT_PCT,
    )) {
      headNodesCache.delete(key);
    }
  }
  if (metadataCache.size > CACHE_MAX_SIZE) {
    for (const key of Array.from(metadataCache.keys()).slice(
      0,
      CACHE_MAX_SIZE * CACHE_EVICT_PCT,
    )) {
      metadataCache.delete(key);
    }
  }
}

export const getHtml = async (url: string): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
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
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml\+xml/.test(contentType))
      throw new Error("Not an HTML document");
    return await response.text();
  } catch (error) {
    console.error("Error fetching HTML:", error);
    return null;
  }
};

export const getHeadChildNodes = (html: string): HeadNodes => {
  if (headNodesCache.has(html)) return headNodesCache.get(html)!;
  const ast = parse(html);
  const head = ast.querySelector("head") || ast;

  const metaTags = head
    .querySelectorAll("meta")
    .map((m) => {
      const { property, name, content } = m.attributes;
      return {
        property: property ?? name ?? "",
        content: content ?? "",
      };
    })
    .filter(({ property, content }) => property && content);

  const title =
    head.querySelector("title")?.text?.trim() ||
    head
      .querySelector('meta[property="og:title"]')
      ?.getAttribute("content")
      ?.trim() ||
    head
      .querySelector('meta[name="twitter:title"]')
      ?.getAttribute("content")
      ?.trim();

  const linkTags = head
    .querySelectorAll("link")
    .map((l) => {
      const { rel, href } = l.attributes;
      return { rel: rel ?? "", href: href ?? "" };
    })
    .filter(({ rel, href }) => rel && href);

  const nodes = { metaTags, title, linkTags };
  headNodesCache.set(html, nodes);
  cleanupCache();
  return nodes;
};

export const getRelativeUrl = (
  baseUrl: string,
  imageUrl: string | null,
): string | null => {
  if (!imageUrl?.trim()) return null;
  if (imageUrl.startsWith("data:")) return imageUrl;
  if (isValidUrl(imageUrl)) return imageUrl;
  if (imageUrl.startsWith("//")) return `https:${imageUrl}`;
  try {
    return new URL(imageUrl, new URL(baseUrl)).toString();
  } catch {
    return null;
  }
};

export const isValidUrl = (str: string): boolean => {
  if (!str?.trim()) return false;
  try {
    if (str.startsWith("http://") || str.startsWith("https://")) {
      new URL(str);
      return true;
    }
    // basic domain (allow /path too)
    return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(str);
  } catch {
    return false;
  }
};

function extractMetadata(
  metaMap: Map<string, string>,
  titleTag: string | undefined,
  url: string,
): MetadataResult {
  const fallbackTitle = new URL(url).hostname;
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

export const getMetaTags = async (url: string): Promise<MetadataResult> => {
  const normalizedUrl =
    url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;
  if (!isValidUrl(normalizedUrl)) throw new Error("Invalid URL provided");

  const cacheKey = normalizedUrl.toLowerCase();
  if (metadataCache.has(cacheKey)) return metadataCache.get(cacheKey)!;

  async function fetchMetadata(fetchUrl: string): Promise<MetadataResult> {
    const html = await getHtml(fetchUrl);
    if (!html) {
      return {
        title: new URL(fetchUrl).hostname,
        description: "No description available",
        image: null,
      };
    }
    const { metaTags, title: titleTag, linkTags } = getHeadChildNodes(html);
    const metaMap = new Map<string, string>();
    for (const { property, content } of metaTags) {
      const key = property.toLowerCase();
      const shouldOverride =
        !metaMap.has(key) || key.includes("og:") || key.includes("twitter:");
      if (shouldOverride) metaMap.set(key, content);
    }
    for (const { rel, href } of linkTags) {
      if (!metaMap.has(rel)) metaMap.set(rel, href);
    }
    return extractMetadata(metaMap, titleTag, fetchUrl);
  }

  try {
    const metadata = await fetchMetadata(normalizedUrl);
    if (
      metadata.title === new URL(normalizedUrl).hostname &&
      metadata.description === "No description available" &&
      !metadata.image
    ) {
      const rootDomain = new URL(normalizedUrl).origin;
      if (rootDomain !== normalizedUrl) {
        console.warn(
          `No metadata found for ${normalizedUrl}. Trying root domain.`,
        );
        const rootMeta = await fetchMetadata(rootDomain);
        metadataCache.set(cacheKey, metadata);
        metadataCache.set(rootDomain.toLowerCase(), rootMeta);
        return rootMeta;
      }
    }
    metadataCache.set(cacheKey, metadata);
    return metadata;
  } catch (error) {
    console.error("Error in getMetaTags:", error);
    const fallback = {
      title: new URL(normalizedUrl).hostname,
      description: "No description available",
      image: null,
    };
    metadataCache.set(cacheKey, fallback);
    return fallback;
  }
};
