import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: import("next").NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["oxidize-ashen-pastel.ngrok-free.dev"],

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      // CDN and storage services
      { hostname: "public.blob.vercel-storage.com" },
      { hostname: "res.cloudinary.com" },
      { hostname: "zplink.s3.ap-south-1.amazonaws.com" },
      { hostname: "files.slugy.co" },
      { hostname: "opengraph.b-cdn.net" },
      { hostname: "api.producthunt.com" },
      { hostname: "img.shields.io" },
      { hostname: "peerlist.io" },
      { hostname: "github.com" },
      { hostname: "direct" },
      { hostname: "images.unsplash.com" },
      { hostname: "ik.imagekit.io" },

      // Social media platforms
      { hostname: "abs.twimg.com" },
      { hostname: "pbs.twimg.com" },

      // Avatar and profile services
      { hostname: "avatar.vercel.sh" },
      { hostname: "avatars.githubusercontent.com" },
      { hostname: "lh3.googleusercontent.com" },
      { hostname: "api.dicebear.com" },

      // Icon and favicon services
      { hostname: "img.icons8.com" },
      { hostname: "twenty-icons.com" },
      { hostname: "favicone.com" },
      { hostname: "biological-zinc-xerinae.faviconkit.com" },

      // External services
      { hostname: "www.google.com" },
      { hostname: "flag.vercel.app" },
      { hostname: "flagcdn.com" },
      { hostname: "illustrations.popsy.co" },
      { hostname: "images.prismic.io" },
      { hostname: "api.microlink.io" },

      // Custom domains
      { hostname: "assets.sandipsarkar.dev" },
      { hostname: "assets.slugy.co" },
      { hostname: "slugy.co" },
      { hostname: "slugylink.github.io" },
      { hostname: "i.postimg.cc" },
    ],
  },

  async redirects() {
    return [
      // www → apex: without this, www.slugy.co serves the custom-domain
      // parked page instead of the site (duplicate thin content).
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.slugy.co" }],
        destination: "https://slugy.co/:path*",
        permanent: true,
      },
      {
        source: "/onboarding",
        destination: "/onboarding/welcome",
        permanent: true,
      },
      // Comparison posts for tools that are not link-management competitors.
      // They were published as a batch and read as programmatic content, so
      // they are retired. Redirect rather than 404 in case anything indexed.
      ...["rewardful", "partnerstack", "firstpromoter", "tolt"].map(
        (slug) =>
          ({
            source: `/blogs/slugy-vs-${slug}`,
            destination: "/blogs",
            permanent: true,
          }) as const,
      ),
      {
        source: "/",
        has: [
          {
            type: "header",
            key: "x-authorized",
            value: "(?<authorized>yes|true)",
          },
        ],
        permanent: false,
        destination: "/pricing",
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "assets.slugy.co",
          },
        ],
        destination: "https://assets.sandipsarkar.dev/:path*",
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "slugy",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
