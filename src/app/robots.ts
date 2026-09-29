import { type MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "slugy.co";
  const baseUrl = `https://${rootDomain}`;

  // Private paths stay off-limits for every crawler, AI or not.
  // NOTE: /_next/ is intentionally NOT disallowed — blocking it prevents
  // Google from rendering CSS/JS.
  // NOTE: /share/, /expired/, /test/ are intentionally NOT disallowed:
  // robots-disallow takes precedence over meta noindex and produces the
  // exact "Blocked by robots.txt" GSC warning. Those pages carry
  // meta noindex instead, so crawlers can see the noindex tag.
  // /share/ additionally supports per-report `allowIndexing` opt-in —
  // a blanket disallow would block reports users explicitly want indexed.
  const privatePaths = ["/api/", "/app/", "/admin/", "/private/", "/temp/"];

  // AI crawlers are intentionally allowed on public marketing content
  // (comparison pages, blogs, pricing) so LLMs can cite and recommend
  // Slugy. Training + retrieval bots included deliberately.
  const aiBots = [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "CCBot",
    "anthropic-ai",
    "ClaudeBot",
    "Claude-Web",
    "Claude-SearchBot",
    "PerplexityBot",
    "Google-Extended",
    "Applebot-Extended",
    "meta-externalagent",
    "Bytespider",
    "cohere-ai",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      ...aiBots.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: privatePaths,
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
