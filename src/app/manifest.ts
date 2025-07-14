import { type MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Slugy - Link Management Platform",
    short_name: "Slugy",
    description:
      "Open-source URL shortener with analytics, link-in-bio pages, and team collaboration features.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#000000",
    scope: "/",
    lang: "en-US",
    categories: ["productivity", "business", "utilities"],

    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
        purpose: "any",
      },
    ],

    related_applications: [
      {
        platform: "web",
        url: "https://slugy.co/",
        id: "slugy-web-app",
      },
    ],

    prefer_related_applications: false,
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
  };
}
