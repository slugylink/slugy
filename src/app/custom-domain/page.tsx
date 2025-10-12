"use client";

import { memo } from "react";
import { motion } from "motion/react";
import { Globe, Link2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bricolage_Grotesque } from "next/font/google";
import { cn } from "@/lib/utils";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: true,
  display: "swap",
});

const CustomDomainLanding = memo(function CustomDomainLanding() {
  const domain = typeof window !== "undefined" ? window.location.hostname : "";

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e8eaf7]/70 via-[#f6efe2]/60 to-[#f7f2ef]/70">
      <div className="mx-auto max-w-6xl px-4 py-20">
        {/* Hero Section */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Icon */}
          <motion.div
            className="mb-8 flex justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.1,
            }}
          >
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-[#ffaa40] to-[#9c40ff] opacity-20 blur-xl" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/50 bg-white/80 shadow-lg backdrop-blur-sm">
                <Globe className="h-12 w-12 text-[#9c40ff]" strokeWidth={1.5} />
              </div>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1
              className={cn(
                bricolage.className,
                "mx-auto inline-block bg-gradient-to-r from-[#ffaa40] via-[#ffaa40]/90 to-[#9c40ff] bg-clip-text text-4xl font-bold text-transparent md:text-6xl",
              )}
            >
              {domain || "Your Custom Domain"}
            </h1>
            <div className="flex items-center justify-center gap-2 text-lg text-zinc-600">
              <Sparkles className="h-5 w-5 text-[#ffaa40]" />
              <p>Powered by Slugy</p>
            </div>
          </motion.div>

          {/* Description */}
          <motion.p
            className="mx-auto mt-6 max-w-2xl text-lg text-zinc-700 md:text-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            This custom domain is successfully configured and ready to share
            short links. Add a slug to the URL to access your shortened links.
          </motion.p>

          {/* CTA */}
          <motion.div
            className="mt-10 flex flex-wrap justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              size="lg"
              className="group bg-gradient-to-r from-[#ffaa40] to-[#9c40ff] text-white shadow-lg transition-all hover:shadow-xl"
              asChild
            >
              <a
                href="https://slugy.co"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Your Own Custom Domain
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {[
            {
              icon: Link2,
              title: "Short Links",
              description:
                "Create memorable short links that are easy to share and remember.",
              color: "text-blue-600",
              bgColor: "bg-blue-50",
            },
            {
              icon: Globe,
              title: "Custom Domain",
              description:
                "Use your own domain to build brand trust and recognition.",
              color: "text-purple-600",
              bgColor: "bg-purple-50",
            },
            {
              icon: Sparkles,
              title: "Analytics",
              description:
                "Track clicks, locations, devices, and more with detailed analytics.",
              color: "text-orange-600",
              bgColor: "bg-orange-50",
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
            >
              <Card className="group border-2 border-white/50 bg-white/60 backdrop-blur-sm transition-all hover:border-white/80 hover:shadow-lg">
                <CardContent className="p-6">
                  <div
                    className={cn(
                      "mb-4 flex h-12 w-12 items-center justify-center rounded-lg",
                      feature.bgColor,
                    )}
                  >
                    <feature.icon
                      className={cn("h-6 w-6", feature.color)}
                      strokeWidth={2}
                    />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-zinc-900">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-600">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div
          className="mt-20 text-center text-sm text-zinc-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <p>
            Built with{" "}
            <a
              href="https://slugy.co"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#9c40ff] hover:underline"
            >
              Slugy
            </a>{" "}
            — The modern link shortener
          </p>
        </motion.div>
      </div>
    </main>
  );
});

CustomDomainLanding.displayName = "CustomDomainLanding";

export default CustomDomainLanding;

