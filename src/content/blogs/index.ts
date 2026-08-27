import type { BlogPost, BlogPostMeta } from "./types";
import LeadConversionTrackingPost from "./posts/lead-conversion-tracking";

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "lead-conversion-tracking",
    title: "How to track lead conversions with Slugy",
    description:
      "Attribute signups and Buy Now clicks back to your Slugy short links using slugy_id, a first-party cookie, and the leads_track API.",
    publishedAt: "2026-08-27",
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
