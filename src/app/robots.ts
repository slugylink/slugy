import { type MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "slugy.co";
  const baseUrl = `https://${rootDomain}`;

  // Private paths stay off-limits for every crawler, AI or not.
  // NOTE: /_next/ is intentionally NOT disallowed — blocking it prevents
  // rendering. /share/ is intentionally NOT disallowed — reports with
  // allowIndexing=true are meant to be indexable.
  // /b/ + /bio/ are disallowed on the root domain so Google consolidates
  // bio galleries on their canonical host (bio.slugy.co) instead of
  // splitting equity across /b/:username + /bio/:username duplicates.
  const privatePaths = [
    "/api/",
    "/app/",
    "/admin/",
    "/private/",
    "/temp/",
    "/test/",
    "/expired/",
    "/b/",
    "/bio/",
    "/onboarding/",
    "/extension/",
    "/monitoring",
    "/sentry-example-page",
    "/custom-domain/not-found",
  ];

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
