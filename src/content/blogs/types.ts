import type { ComponentType } from "react";

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: {
    name: string;
  };
  tags: string[];
  /** Optional Q&A rendered as a visible FAQ section plus FAQPage JSON-LD. */
  faqs?: Array<{ q: string; a: string }>;
}

export interface BlogPost extends BlogPostMeta {
  Content: ComponentType;
}
