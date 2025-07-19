"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback } from "react";
import HeroLinkCard from "./hero-linkcard";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

// Constants
const API_ENDPOINT = "/api/temp";
const MAX_LINKS_DISPLAY = 2;

// URL validation pattern
const urlPattern = /^https?:\/\//;

// Schema validation
const createLinkSchema = z.object({
  url: z
    .string()
    .url("Please enter a valid URL")
    .min(1, "Destination URL is required")
    .refine(
      (url) => {
        try {
          new URL(url);
          return urlPattern.test(url);
        } catch {
          return false;
        }
      },
      {
        message: "Please enter a valid URL (e.g., https://example.com)",
      },
    ),
});

// Type definitions
type FormData = z.infer<typeof createLinkSchema>;

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

// Default link for demonstration
const defaultLink: Link = {
  short: "slugy.co/try",
  original: "https://app.slugy.co/login",
  clicks: 326,
  expires: null,
};

const HeroLinkForm = () => {
  const [links, setLinks] = useState<Link[]>([defaultLink]);

  // SWR hook for fetching links
  const { data, mutate } = useSWR<GetLinksResponse, Error>(
    API_ENDPOINT,
    fetcher,
    {
      onError: (error) => {
        // Only show error toast for non-rate-limit errors
        if (!error.message.includes("Too many requests")) {
          toast.error(error.message);
        }
      },
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createLinkSchema),
  });

  // Update links when data changes
  useEffect(() => {
    if (data?.links && data.links.length > 0) {
      setLinks((prevLinks) => {
        // Filter out new links that already exist
        const newLinks = data.links.filter(
          (newLink) =>
            !prevLinks.some(
              (existingLink) => existingLink.short === newLink.short,
            ),
        );

        // Update click counts for existing links
        const updatedLinks = prevLinks.map((prevLink) => {
          const updatedLink = data.links.find(
            (link) => link.short === prevLink.short,
          );
          return updatedLink
            ? { ...prevLink, clicks: updatedLink.clicks }
            : prevLink;
        });

        return [...newLinks, ...updatedLinks];
      });
    }
  }, [data]);

  // Handle form submission
  const onSubmit = useCallback(
    async (formData: FormData) => {
      try {
        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: formData.url }),
        });

        const result = (await response.json()) as ApiResponse;

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error(
              "You can only create 1 temporary link at a time. Please wait for it to expire or create an account for unlimited links.",
            );
          }
          throw new Error(result.error ?? "Failed to create link");
        }

        // Add new link to the beginning of the list
        setLinks((prevLinks) => [result, ...prevLinks]);
        reset();
        toast.success("Link created successfully!");

        // Revalidate the data
        await mutate();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create link",
        );
      }
    },
    [reset, mutate],
  );

  // Check if we should disable the form
  const isFormDisabled = isSubmitting || links.length >= MAX_LINKS_DISPLAY;

  return (
    <div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="relative z-30 mx-auto mt-10 max-w-[580px] rounded-xl border bg-zinc-100 p-3 backdrop-blur-md"
      >
        <div className="flex items-center justify-center gap-2 rounded-md border bg-white p-1">
          <Input
            type="text"
            className="right-0 w-full border-none focus:right-0 focus-visible:ring-0"
            placeholder="Enter any link"
            required
            autoComplete="off"
            disabled={isFormDisabled}
            {...register("url")}
          />
          <Button
            className="h-full w-auto bg-orange-500 text-sm hover:bg-orange-600 disabled:opacity-50"
            type="submit"
            disabled={isFormDisabled}
          >
            {isSubmitting && (
              <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
            )}
            Shorten
          </Button>
        </div>
      </form>

      {/* Shortened Links List */}
      <div className="mx-auto mt-4 max-w-[580px] space-y-3">
        {links.map((link, idx) => (
          <HeroLinkCard key={`${link.short}-${idx}`} link={link} />
        ))}
      </div>

      {/* Analytics/Claim Message */}
      <div className="mx-auto mt-5 max-w-sm text-center text-sm text-zinc-500">
        Want to claim your links, edit them, or view their analytics?{" "}
        <a
          href="https://app.slugy.co/login"
          className="text-black underline transition-colors hover:text-gray-700"
        >
          Create a free account to get started.
        </a>
      </div>
    </div>
  );
};

export default HeroLinkForm;
