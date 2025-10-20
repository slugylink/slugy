import { type MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  let domain = headersList.get("host") ?? "slugy.co";

  // Normalize domain for development and preview environments
  if (
    domain === "localhost:3000" ||
    domain.endsWith(".vercel.app") ||
    domain.includes("preview")
  ) {
    domain = "slugy.co";
  }

  const baseUrl = `https://${domain}`;
  const currentDate = new Date();
  const lastWeek = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Static pages with their priorities and update frequencies
  const staticPages: MetadataRoute.Sitemap = [
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
      url: `${baseUrl}/blogs`,
      lastModified: lastWeek,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/expired`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Combine all sitemaps
  return [...staticPages];
}
