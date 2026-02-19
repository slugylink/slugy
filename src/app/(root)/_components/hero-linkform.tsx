"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import { toast } from "sonner";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";

import { Input } from "@/components/ui/input";
import HeroLinkCard from "./hero-linkcard";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import Image from "next/image";

// ----------------- Constants -----------------
const API_ENDPOINT = "/api/temp";
const MAX_LINKS_DISPLAY = 2;
const DEFAULT_LINK = {
  short: "slugy.co/git",
  original: "https://github.com/slugylink/slugy",
  clicks: 3232,
  expires: null,
} as const;

// Memoized validation schema for better performance
const createLinkSchema = (() => {
  const urlPattern = /^https?:\/\//;
  return z.object({
    url: z
      .string()
      .min(3, "Destination URL is required")
      .refine(
        (url) => {
          if (urlPattern.test(url)) {
            try {
              new URL(url);
              return true;
            } catch {
              return false;
            }
          }
          return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(url);
        },
        {
          message:
            "Please enter a valid URL (e.g., https://example.com or example.com)",
        },
      ),
  });
})();

type FormData = z.infer<typeof createLinkSchema>;

// ----------------- Types -----------------
interface Link {
  short: string;
  original: string;
  clicks: number;
  expires: string | null;
}

interface ApiResponse {
  short: string;
  original: string;
  clicks: number;
  expires: string;
  error?: string;
}

interface GetLinksResponse {
  success: boolean;
  data?: {
    links: Link[];
  };
  links?: Link[]; // Fallback for direct links array
  error?: string;
}

// ----------------- Component -----------------
const HeroLinkForm = memo(function HeroLinkForm() {
  const [links, setLinks] = useState<Link[]>([DEFAULT_LINK]);

  // SWR: fetching existing links
  const { data, mutate } = useSWR<GetLinksResponse, Error>(
    API_ENDPOINT,
    fetcher,
    {
      onError: (error) => {
        if (!/Too many requests/i.test(error.message)) {
          toast.error(error.message);
        }
      },
      revalidateOnFocus: false,
    },
  );

  // Form handling
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createLinkSchema),
  });

  // Update links when new data arrives
  useEffect(() => {
    // Handle both wrapped (data.data.links) and unwrapped (data.links) response formats
    const linksArray = data?.data?.links || data?.links || [];

    if (!linksArray.length) return;

    setLinks((prevLinks) => {
      const newLinks = linksArray.filter(
        (l) => !prevLinks.some((existing) => existing.short === l.short),
      );
      const updatedLinks = prevLinks.map(
        (prev) => linksArray.find((l) => l.short === prev.short) ?? prev,
      );
      return [...newLinks, ...updatedLinks];
    });
  }, [data]);

  // Form submit handler
  const onSubmit = useCallback(
    async (formData: FormData) => {
      try {
        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const result = (await response.json()) as
          | ApiResponse
          | { success: boolean; data?: ApiResponse; error?: string };

        if (!response.ok) {
          throw new Error(
            response.status === 429
              ? "You can only create 1 temporary link at a time. Please wait for it to expire or create an account for unlimited links."
              : "error" in result
                ? result.error
                : "Failed to create link",
          );
        }

        // Handle both wrapped (result.data) and unwrapped (result) response formats
        const linkData =
          "data" in result && result.data
            ? result.data
            : "success" in result && result.success
              ? result
              : null;

        if (linkData && "short" in linkData) {
          setLinks((prev) => [linkData as Link, ...prev]);
        }
        reset();
        toast.success("Link created successfully!");
        await mutate();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create link",
        );
      }
    },
    [reset, mutate],
  );

  const isFormDisabled = isSubmitting || links.length >= MAX_LINKS_DISPLAY;

  return (
    <div>
      {/* Form */}
      <LazyMotion features={domAnimation}>
        <m.form
          onSubmit={handleSubmit(onSubmit)}
          className="relative z-30 mx-auto mt-10 max-w-[580px] rounded-2xl border bg-zinc-100/60 p-2 backdrop-blur-md sm:p-2.5"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{
            duration: 0.4,
            delay: 0.1,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          <div className="flex items-center gap-2 rounded-lg border bg-white p-1">
            <Input
              type="text"
              placeholder="Enter a destination URL"
              disabled={isFormDisabled}
              autoComplete="off"
              {...register("url")}
              className="w-full border-none focus-visible:ring-0"
              required
            />
            <Button
              type="submit"
              disabled={isFormDisabled}
              className="rounded-lg bg-orange-500 text-sm hover:bg-orange-600 disabled:opacity-50"
            >
              {isSubmitting && (
                <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
              )}
              Shorten{" "}
              <Image
                src="/icons/star.svg"
                alt=""
                width={16}
                height={16}
                priority
                sizes="16px"
              />
            </Button>
          </div>
          {/* Links */}
          <div className="mx-auto mt-6 max-w-[580px] space-y-2.5">
            <AnimatePresence initial={false}>
              {links.map((link) => (
                <m.div
                  key={link.short}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{
                    duration: 0.25,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  layout
                >
                  <HeroLinkCard link={link} />
                </m.div>
              ))}
            </AnimatePresence>
          </div>
        </m.form>
      </LazyMotion>

      {/* CTA */}
      <div className="mx-auto mt-5 max-w-sm text-center text-sm text-zinc-700">
        Want to claim your links, edit them, or view their analytics?{" "}
        <a
          href="https://app.slugy.co/login"
          className="text-black underline hover:text-gray-700"
        >
          Create a free account to get started.
        </a>
      </div>
    </div>
  );
});

HeroLinkForm.displayName = "HeroLinkForm";

export default HeroLinkForm;
