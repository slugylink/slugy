/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
// await import("./src/env.js");

const nextConfig: import("next").NextConfig = {
  images: {
    remotePatterns: [
      // CDN and storage services
      { hostname: "public.blob.vercel-storage.com" },
      { hostname: "res.cloudinary.com" },
      { hostname: "zplink.s3.ap-south-1.amazonaws.com" },
      { hostname: "opengraph.b-cdn.net" },

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
      { hostname: "icons.duckduckgo.com" },
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
      { hostname: "slugylink.github.io"},
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
      // {
      //   source: "/:path*",
      //   has: [
      //     {
      //       type: "host",
      //       value: "api.localhost:3000",
      //     },
      //   ],
      //   destination: "http://localhost:3000/:path*",
      // },
    ];
  },
};

export default nextConfig;
