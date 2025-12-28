import { withSentryConfig } from "@sentry/nextjs";
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
      { hostname: "files.slugy.co" },
      { hostname: "opengraph.b-cdn.net" },
      { hostname: "api.producthunt.com" },
      { hostname: "img.shields.io" },
      { hostname: "peerlist.io" },
      { hostname: "github.com" },
      { hostname: "direct" },

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

export default withSentryConfig(nextConfig, {
 // For all available options, see:
 // https://www.npmjs.com/package/@sentry/webpack-plugin#options

 org: "slugy",

 project: "javascript-nextjs",

 // Only print logs for uploading source maps in CI
 silent: !process.env.CI,

 // For all available options, see:
 // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

 // Upload a larger set of source maps for prettier stack traces (increases build time)
 widenClientFileUpload: true,

 // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
 // This can increase your server load as well as your hosting bill.
 // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
 // side errors will fail.
 tunnelRoute: "/monitoring",

 webpack: {
   // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
   // See the following for more information:
   // https://docs.sentry.io/product/crons/
   // https://vercel.com/docs/cron-jobs
   automaticVercelMonitors: true,

   // Tree-shaking options for reducing bundle size
   treeshake: {
     // Automatically tree-shake Sentry logger statements to reduce bundle size
     removeDebugLogging: true,
   },
 },
});
