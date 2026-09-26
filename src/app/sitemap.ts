import { type MetadataRoute } from "next";
import { getAllPosts } from "@/content/blogs";

export default function sitemap(): MetadataRoute.Sitemap {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "slugy.co";
  const baseUrl = `https://${rootDomain}`;
  const currentDate = new Date();
  const lastWeek = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Every blog/comparison post, newest first. Comparison pages convert, so
  // they get high priority. lastModified tracks content freshness.
  const posts = getAllPosts().map((post) => ({
    url: `${baseUrl}/blogs/${post.slug}`,
    lastModified: new Date(post.updatedAt ?? post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: post.tags?.includes("comparison") ? 0.8 : 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: lastWeek,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/alternative/bitly`,
      lastModified: lastWeek,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blogs`,
      lastModified: lastWeek,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...posts,
    {
      url: `${baseUrl}/custom-domain`,
      lastModified: lastWeek,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/sponsors`,
      lastModified: lastWeek,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
