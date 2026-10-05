import type { BlogPost, BlogPostMeta } from "./types";
import LeadConversionTrackingPost from "./posts/lead-conversion-tracking";
import SlugyIntegrationsPost from "./posts/slugy-integrations";
import SlugyVsBitlyPost from "./posts/slugy-vs-bitly";
import SlugyVsDubPost from "./posts/slugy-vs-dub";
import SlugyVsRebrandlyPost from "./posts/slugy-vs-rebrandly";
import SlugyVsShortIoPost from "./posts/slugy-vs-short-io";
import SlugyVsBlinkPost from "./posts/slugy-vs-blink";

// Comparisons are published on their own cadence, spaced weeks apart, and each
// one is re-checked against the competitor's public pricing pages on a schedule.
// Publishing a batch of comparisons on a single date is the clearest signal that
// a comparison set is a marketing artifact rather than research, so do not
// reintroduce a shared date here.
const REFRESHED_ON = "2026-09-30";

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "lead-conversion-tracking",
    title: "How to track lead conversions with Slugy",
    description:
      "Pro lead tracking: enable it on the link, capture slugy_id on your site, and attribute signups with the leads_track API.",
    publishedAt: "2026-08-27",
    updatedAt: "2026-09-04",
    author: { name: "Slugy" },
    tags: ["leads", "analytics", "guides"],
    Content: LeadConversionTrackingPost,
  },
  {
    slug: "slugy-integrations",
    title:
      "Slugy integrations: Slack, Zapier, Polar, Shopify, WordPress and more",
    description:
      "Connect notifications, automation, and revenue attribution: Slack alerts and /shorten, signed webhooks for Zapier and Make, Polar and Shopify sales, and WordPress auto-shorten.",
    publishedAt: "2026-10-05",
    updatedAt: "2026-10-05",
    author: { name: "Slugy" },
    tags: ["integrations", "guides", "automation"],
    Content: SlugyIntegrationsPost,
  },
  {
    slug: "slugy-vs-bitly",
    title: "Slugy vs Bitly: which one fits your link management",
    description:
      "An honest comparison of pricing, custom domains, QR codes, bio pages, and lead attribution — plus what Bitly does better and how to migrate.",
    publishedAt: "2026-07-14",
    updatedAt: REFRESHED_ON,
    author: { name: "Slugy" },
    tags: ["comparison", "bitly", "alternative"],
    Content: SlugyVsBitlyPost,
  },
  {
    slug: "slugy-vs-dub",
    title: "Slugy vs Dub.co: two open-source link platforms compared",
    description:
      "Both are open source. Compare community size, documentation, pricing, and where lead and revenue attribution actually lands in the tier ladder.",
    publishedAt: "2026-07-28",
    updatedAt: REFRESHED_ON,
    author: { name: "Slugy" },
    tags: ["comparison", "dub", "alternative"],
    Content: SlugyVsDubPost,
  },
  {
    slug: "slugy-vs-rebrandly",
    title: "Slugy vs Rebrandly: branding first, or attribution first",
    description:
      "Rebrandly is built for link branding. Slugy adds analytics depth, bio pages, and conversion attribution. Where each one is the stronger choice.",
    publishedAt: "2026-08-11",
    updatedAt: REFRESHED_ON,
    author: { name: "Slugy" },
    tags: ["comparison", "rebrandly", "alternative"],
    Content: SlugyVsRebrandlyPost,
  },
  {
    slug: "slugy-vs-short-io",
    title: "Slugy vs Short.io: API scale versus setup speed",
    description:
      "Short.io is built for embedded, white-label link infrastructure. Slugy is for teams that need links, QR, bio pages, and conversions live the same day.",
    publishedAt: "2026-08-25",
    updatedAt: REFRESHED_ON,
    author: { name: "Slugy" },
    tags: ["comparison", "short.io", "alternative"],
    Content: SlugyVsShortIoPost,
  },
  {
    slug: "slugy-vs-blink",
    title: "Slugy vs BL.INK: enterprise link analytics, self-serve",
    description:
      "BL.INK sells compliance and admin controls. Slugy brings analytics depth, QR, bio pages, and conversion tracking without an enterprise sales cycle.",
    publishedAt: "2026-09-08",
    updatedAt: REFRESHED_ON,
    author: { name: "Slugy" },
    tags: ["comparison", "blink", "alternative"],
    Content: SlugyVsBlinkPost,
  },
];

export function getAllPosts(): BlogPostMeta[] {
  return BLOG_POSTS.map(({ Content: _Content, ...meta }) => meta).sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getPostSlugs(): string[] {
  return BLOG_POSTS.map((post) => post.slug);
}
