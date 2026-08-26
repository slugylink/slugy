import { type MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "slugy.co";
  const baseUrl = `https://${rootDomain}`;
  const currentDate = new Date();
  const lastWeek = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

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
      url: `${baseUrl}/sponsors`,
      lastModified: lastWeek,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
