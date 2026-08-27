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
}

export interface BlogPost extends BlogPostMeta {
  Content: ComponentType;
}
