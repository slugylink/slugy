import { type MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "slugy.co";
  const baseUrl = `https://${rootDomain}`;

  // /_next/ powers rendering, /share/ hosts indexable reports, and /b/+/bio/
  // stay consolidated on bio.slugy.co — none are disallowed lightly.
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
    // Infra route, not a marketing page.
    "/custom-domain",
  ];

  // AI crawlers may cite public marketing content (training bots included).
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
