/**
 * Substring bot signatures, matched case-insensitively against the
 * lowercased user agent (`ua.includes(pattern.toLowerCase())`).
 *
 * Deliberately EXCLUDES bare social generics ("facebook", "twitter",
 * "instagram", "linkedin", "pinterest", "reddit", "vk") and bare "bot" /
 * "bing" / "preview": in-app browsers ship those tokens
 * (e.g. `... Instagram 302.0 ...`, `Twitter for iPhone`), so they
 * undercounted real humans as bots. Precise crawler tokens stay, plus
 * library/automation UAs that previously passed as humans.
 */
export const METADATA_BOT_PATTERNS = [
  // Social crawlers (precise tokens — NOT bare app names)
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "LinkedInBot",
  "Pinterestbot",
  "vkShare",
  "redditbot",
  "Applebot",
  "applebot",
  "WhatsApp",
  "whatsapp",
  "TelegramBot",
  "telegram",
  "Discordbot",
  "discord",
  "Slackbot",
  "slack",
  "Viber",
  "viber",
  "Microlink",
  "microlink",
  // In-app browser shells (unfurl fetches, not human page views)
  "fban",
  "fbios",
  "fbav",

  // Search Engines (excluding Google)
  "Bingbot",
  "Slurp",
  "DuckDuckBot",
  "Baiduspider",
  "YandexBot",
  "Sogou",
  "Exabot",
  "Bytespider",
  "PetalBot",
  "DotBot",

  // AI crawlers
  "chatgpt-user",
  "gptbot",
  "ccbot",
  "anthropic-ai",
  "claudebot",
  "cohere-ai",
  "bluesky",

  // Mail Services
  "Thunderbird",
  "Outlook-iOS",
  "Outlook-Android",

  // Blogging and RSS
  "Feedly",
  "Feedspot",
  "Feedbin",
  "NewsBlur",

  // Archiving
  "ia_archiver",
  "archive.org_bot",

  // Security and Monitoring
  "Uptimebot",
  "Monitis",
  "NewRelicPinger",
  "pingdom",
  "gtmetrix",
  "lighthouse",

  // HTTP libraries / scripts (previously counted as humans)
  "curl",
  "wget",
  "python-requests",
  "python-urllib",
  "python-httpx",
  "httpx",
  "axios",
  "okhttp",
  "java/",
  "libwww-perl",
  "scrapy",
  "ahrefs",
  "semrush",
  "mj12",

  // Automation / headless
  "HeadlessChrome",
  "headless",
  "phantom",
  "selenium",
  "puppeteer",
  "playwright",

  // Development Tools
  "Postman",
  "insomnia",

  // Generic Patterns (word-boundary-safe: no bare "bot"/"bing"/"preview",
  // which substring-matched human UAs like "Boto" or in-app browsers)
  "crawler",
  "crawling",
  "spider",
  "Go-http-client",
  "prerender",
  "MetaInspector",
  "iframely",
  "msnbot",
  "teoma",
];
