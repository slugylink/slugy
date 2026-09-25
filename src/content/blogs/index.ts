import type { BlogPost, BlogPostMeta } from "./types";
import LeadConversionTrackingPost from "./posts/lead-conversion-tracking";
import SlugyVsBitlyPost from "./posts/slugy-vs-bitly";
import SlugyVsDubPost from "./posts/slugy-vs-dub";
import SlugyVsRebrandlyPost from "./posts/slugy-vs-rebrandly";
import SlugyVsShortIoPost from "./posts/slugy-vs-short-io";
import SlugyVsBlinkPost from "./posts/slugy-vs-blink";
import SlugyVsRewardfulPost from "./posts/slugy-vs-rewardful";
import SlugyVsPartnerstackPost from "./posts/slugy-vs-partnerstack";
import SlugyVsFirstpromoterPost from "./posts/slugy-vs-firstpromoter";
import SlugyVsToltPost from "./posts/slugy-vs-tolt";

const COMPARE_DATE = "2026-09-26";

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "slugy-vs-bitly",
    title: "Slugy vs Bitly: branded links without enterprise pricing",
    description:
      "How Slugy compares to Bitly on branded links, QR codes, bio pages, and conversion tracking — and how to migrate via CSV.",
    publishedAt: COMPARE_DATE,
    author: { name: "Slugy" },
    tags: ["comparison", "bitly", "alternative"],
    Content: SlugyVsBitlyPost,
  },
  {
    slug: "slugy-vs-dub",
    title: "Slugy vs Dub.co: two open-source takes on link management",
    description:
      "Both Slugy and Dub.co are open source. Compare bio pages, lead conversion tracking, and free plans to pick your fit.",
    publishedAt: COMPARE_DATE,
    author: { name: "Slugy" },
    tags: ["comparison", "dub", "alternative"],
    Content: SlugyVsDubPost,
  },
  {
    slug: "slugy-vs-rebrandly",
    title: "Slugy vs Rebrandly: branding plus proof of what worked",
    description:
      "Rebrandly nails branded links. See where Slugy adds analytics depth, bio pages, and conversion attribution.",
    publishedAt: COMPARE_DATE,
    author: { name: "Slugy" },
    tags: ["comparison", "rebrandly", "alternative"],
    Content: SlugyVsRebrandlyPost,
  },
  {
    slug: "slugy-vs-short-io",
    title: "Slugy vs Short.io: speed and breadth over infrastructure",
    description:
      "Short.io is built for white-label scale. Slugy is the faster alternative with QR, bio, and conversions included.",
    publishedAt: COMPARE_DATE,
    author: { name: "Slugy" },
    tags: ["comparison", "short.io", "alternative"],
    Content: SlugyVsShortIoPost,
  },
  {
    slug: "slugy-vs-blink",
    title: "Slugy vs BL.INK: analytics depth without enterprise sales",
    description:
      "BL.INK serves regulated enterprises. Slugy brings funnels, QR, bio, and conversion tracking self-serve.",
    publishedAt: COMPARE_DATE,
    author: { name: "Slugy" },
    tags: ["comparison", "blink", "alternative"],
    Content: SlugyVsBlinkPost,
  },
  {
    slug: "slugy-vs-rewardful",
    title: "Slugy vs Rewardful: different tools that work together",
    description:
      "Rewardful runs affiliate commissions; Slugy brands the links affiliates share. How to use both.",
    publishedAt: COMPARE_DATE,
    author: { name: "Slugy" },
    tags: ["comparison", "rewardful", "affiliate"],
    Content: SlugyVsRewardfulPost,
  },
  {
    slug: "slugy-vs-partnerstack",
    title: "Slugy vs PartnerStack: channel management meets link layer",
    description:
      "PartnerStack grows partner channels; Slugy brands and measures the links partners distribute.",
    publishedAt: COMPARE_DATE,
    author: { name: "Slugy" },
    tags: ["comparison", "partnerstack", "affiliate"],
    Content: SlugyVsPartnerstackPost,
  },
  {
    slug: "slugy-vs-firstpromoter",
    title: "Slugy vs FirstPromoter: revenue attribution plus click data",
    description:
      "FirstPromoter attributes sales to affiliates; Slugy shows the branded links and clicks behind them.",
    publishedAt: COMPARE_DATE,
    author: { name: "Slugy" },
    tags: ["comparison", "firstpromoter", "affiliate"],
    Content: SlugyVsFirstpromoterPost,
  },
  {
    slug: "slugy-vs-tolt",
    title: "Slugy vs Tolt: lean affiliate tracking, branded links",
    description:
      "Tolt keeps SaaS affiliate payouts simple; Slugy adds branded links, QR, and analytics on a free plan.",
    publishedAt: COMPARE_DATE,
    author: { name: "Slugy" },
    tags: ["comparison", "tolt", "affiliate"],
    Content: SlugyVsToltPost,
  },
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
