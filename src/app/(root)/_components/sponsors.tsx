"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLinkIcon } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";

const sponsors = [
  {
    name: "Neon",
    icon: "/icons/neon-logo.webp",
    description: "Modern serverless database platform",
    link: "https://neon.tech",
    linkText: "Learn more about Neon",
  },
];

export default function Sponsors() {
  return (
    <div className="bg-transparent dark:bg-[#121212]">
      <div className="mx-auto max-w-6xl mt-12 px-4 py-16">
        {/* Header Section */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-2xl font-medium text-balance sm:text-4xl">
            Our Sponsors & Supporters
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm sm:text-base">
            We&apos;re grateful to the amazing companies and organizations that
            support the development of Slugy and help us build better tools for
            everyone.
          </p>
        </motion.div>

        {/* Sponsors Section */}
        <motion.div
          className=" flex items-center justify-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        >
          {sponsors.map((sponsor, index) => (
            <motion.div
              key={sponsor.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                ease: "easeOut",
                delay: 0.3 + index * 0.1,
              }}
              className="w-full max-w-sm rounded-2xl border bg-zinc-100/80 p-1"
            >
                <div className="relative mx-auto aspect-video w-[50%]">
                    <Image
                      src={sponsor.icon}
                      alt={sponsor.name}
                      fill
                      className="h-12 w-12 object-contain"
                    />
                  </div>
              <Card className="h-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
               
                <CardContent className="pt-0">
                  <CardDescription className="mb-4 text-base text-gray-600 dark:text-gray-300 text-center">
                    {sponsor.description}
                  </CardDescription>
                  <div className="border-t border-gray-200 pt-4 dark:border-gray-700 mx-auto text-center">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white w-full"
                      asChild
                    >
                      <a
                        href={sponsor.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1"
                      >
                        {sponsor.linkText}
                        <ExternalLinkIcon className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
