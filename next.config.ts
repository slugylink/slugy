import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: import("next").NextConfig = {
  images: {
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
      {
        source: "/onboarding",
        destination: "/onboarding/welcome",
        permanent: true,
      },
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
