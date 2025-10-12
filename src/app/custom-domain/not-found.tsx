"use client";

import { memo } from "react";
import { motion } from "motion/react";
import { AlertCircle, Home, ArrowLeft, Link2 } from "lucide-react";
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

const CustomDomainNotFound = memo(function CustomDomainNotFound() {
  const domain = typeof window !== "undefined" ? window.location.hostname : "";
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e8eaf7]/70 via-[#f6efe2]/60 to-[#f7f2ef]/70">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-20">
        {/* 404 Animation */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1,
          }}
        >
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-red-400 to-orange-400 opacity-20 blur-2xl" />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-2 border-white/50 bg-white/80 shadow-xl backdrop-blur-sm">
              <AlertCircle className="h-16 w-16 text-red-500" strokeWidth={1.5} />
            </div>
          </div>
        </motion.div>

        {/* 404 Text */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1
            className={cn(
              bricolage.className,
              "mb-2 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-8xl font-bold text-transparent md:text-9xl",
            )}
          >
            404
          </h1>
          <h2 className="mb-4 text-2xl font-semibold text-zinc-900 md:text-3xl">
            Link Not Found
          </h2>
          <p className="mx-auto max-w-lg text-lg text-zinc-600">
            The short link you&apos;re looking for doesn&apos;t exist on{" "}
            <span className="font-semibold text-zinc-900">{domain}</span>
          </p>
        </motion.div>

        {/* Error Details Card */}
        <motion.div
          className="mt-10 w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-2 border-white/50 bg-white/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-zinc-700">Domain:</span>
                  <code className="rounded bg-zinc-100 px-2 py-1 text-zinc-900">
                    {domain}
                  </code>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-zinc-700">Path:</span>
                  <code className="rounded bg-zinc-100 px-2 py-1 text-zinc-900">
                    {pathname || "/"}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Possible Reasons */}
        <motion.div
          className="mt-8 w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-2 border-white/50 bg-white/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900">
                <Link2 className="h-5 w-5" />
                Possible Reasons
              </h3>
              <ul className="space-y-2 text-zinc-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  <span>The link has been deleted or expired</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  <span>There&apos;s a typo in the URL</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  <span>The link was never created</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="mt-10 flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Button
            size="lg"
            variant="outline"
            className="group border-2 bg-white/80 backdrop-blur-sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Go Back
          </Button>
          <Button
            size="lg"
            className="group bg-gradient-to-r from-[#ffaa40] to-[#9c40ff] text-white shadow-lg transition-all hover:shadow-xl"
            onClick={() => (window.location.href = "/")}
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Homepage
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="mt-16 text-center text-sm text-zinc-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <p>
            Powered by{" "}
            <a
              href="https://slugy.co"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#9c40ff] hover:underline"
            >
              Slugy
            </a>
          </p>
        </motion.div>
      </div>
    </main>
  );
});

CustomDomainNotFound.displayName = "CustomDomainNotFound";

export default CustomDomainNotFound;

