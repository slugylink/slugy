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
import SignupLink from "@/components/web/signup-link";

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
  const urlPattern = /^https?:\/\//i;
  return z.object({
    url: z
      .string()
      .trim()
      .min(3)
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
      )
      .transform((url) =>
        urlPattern.test(url)
          ? new URL(url).href
          : new URL(`https://${url}`).href,
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
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    resolver: zodResolver(createLinkSchema),
  });

  // Update links when new data arrives
  useEffect(() => {
    // Handle both wrapped (data.data.links) and unwrapped (data.links) response formats
    const linksArray = data?.data?.links || data?.links || [];

    if (!data) return;

    setLinks([...linksArray, DEFAULT_LINK]);
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

        if (!response.ok || ("success" in result && !result.success)) {
          throw new Error(
            response.status === 429
              ? "You can only create 1 temporary link at a time. Please wait for it to expire or create an account to manage more links."
              : "error" in result
                ? result.error
                : "Failed to create link",
          );
        }

        // Handle both wrapped (result.data) and unwrapped (result) response formats
        const linkData =
          "data" in result && result.data
            ? result.data
            : "short" in result
              ? result
              : null;

        if (!linkData || !("short" in linkData)) {
          throw new Error("Could not create the link. Please try again.");
        }
        setLinks([linkData as Link, DEFAULT_LINK]);
        reset();
        toast.success("Link created successfully!");
        void mutate().catch(() => {});
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create link",
        );
      }
    },
    [reset, mutate],
  );

  // Re-enable the trial when its temporary link expires, even without a reload.
  useEffect(() => {
    const expirations = links
      .flatMap((link) => (link.expires ? [Date.parse(link.expires)] : []))
      .filter(Number.isFinite);
    if (!expirations.length) return;
    const timeout = setTimeout(
      () => {
        setLinks((current) =>
          current.filter(
            (link) => !link.expires || Date.parse(link.expires) > Date.now(),
          ),
        );
        void mutate().catch(() => {});
      },
      Math.max(0, Math.min(...expirations) - Date.now()) + 100,
    );
    return () => clearTimeout(timeout);
  }, [links, mutate]);

  const isFormDisabled = isSubmitting || links.length >= MAX_LINKS_DISPLAY;

  return (
    <div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="relative z-30 mx-auto mt-10 max-w-[580px] rounded-[18px] bg-zinc-100/80 p-2 shadow-sm sm:p-2.5"
      >
        <div className="flex items-center gap-2 rounded-xl border bg-white p-1">
          <Input
            id="trial-url"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!errors.url}
            aria-describedby={
              errors.url ? "trial-error trial-hint" : "trial-hint"
            }
            placeholder="Enter a destination URL"
            disabled={isFormDisabled}
            autoComplete="off"
            {...register("url")}
            className="min-w-0 flex-1 border-none focus-visible:ring-2"
            required
          />
          <Button
            type="submit"
            disabled={isFormDisabled}
            className="rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting && (
              <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
            )}
            Shorten{" "}
          </Button>
        </div>
        {errors.url && (
          <p
            id="trial-error"
            role="alert"
            className="text-destructive mt-2 px-1 text-sm"
          >
            {errors.url.message}
          </p>
        )}
        <div className="mx-auto mt-4 max-w-[580px] space-y-2">
          <LazyMotion features={domAnimation}>
            <AnimatePresence initial={false}>
              {links.map((link) => (
                <m.div
                  key={link.short}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{
                    duration: 0.22,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  <HeroLinkCard link={link} />
                </m.div>
              ))}
            </AnimatePresence>
          </LazyMotion>
        </div>
      </form>

      {/* CTA */}
      <div className="mx-auto mt-5 max-w-sm text-center text-sm text-zinc-800">
        Want to claim your links, edit them, or view their analytics?{" "}
        <SignupLink className="text-black underline hover:text-gray-700">
          Create an account to get started.
        </SignupLink>
      </div>
    </div>
  );
});

HeroLinkForm.displayName = "HeroLinkForm";

export default HeroLinkForm;
