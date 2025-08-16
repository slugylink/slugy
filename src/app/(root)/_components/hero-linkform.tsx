"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import HeroLinkCard from "./hero-linkcard";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { fetcher } from "@/lib/fetcher";

// ----------------- Constants -----------------
const API_ENDPOINT = "/api/temp";
const MAX_LINKS_DISPLAY = 2;
const DEFAULT_LINK = {
  short: "slugy.co/git",
  original: "https://github.com/slugylink/slugy",
  clicks: 650,
  expires: null,
} as const;

// ----------------- Validation Schema -----------------
const urlPattern = /^https?:\/\//;
const createLinkSchema = z.object({
  url: z
    .string()
    .min(1, "Destination URL is required")
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
  links: Link[];
  error?: string;
}

// ----------------- Component -----------------
const HeroLinkForm = () => {
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
      revalidateOnReconnect: true,
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
    if (!data?.links?.length) return;

    setLinks((prevLinks) => {
      const newLinks = data.links.filter(
        (l) => !prevLinks.some((existing) => existing.short === l.short),
      );
      const updatedLinks = prevLinks.map(
        (prev) => data.links.find((l) => l.short === prev.short) ?? prev,
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

        const result = (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(
            response.status === 429
              ? "You can only create 1 temporary link at a time. Please wait for it to expire or create an account for unlimited links."
              : (result.error ?? "Failed to create link"),
          );
        }

        setLinks((prev) => [result, ...prev]);
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

  // Derived UI state
  const isFormDisabled = useMemo(
    () => isSubmitting || links.length >= MAX_LINKS_DISPLAY,
    [isSubmitting, links.length],
  );

  return (
    <div>
      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="relative z-30 mx-auto mt-10 max-w-[580px] rounded-2xl border bg-zinc-100/70 p-2 backdrop-blur-md sm:p-2.5"
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
            Shorten
          </Button>
        </div>
        {/* Links */}
        <div className="mx-auto mt-6 max-w-[580px] space-y-2.5">
          {links.map((link) => (
            <HeroLinkCard key={link.short} link={link} />
          ))}
        </div>
      </form>

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
};

export default HeroLinkForm;
