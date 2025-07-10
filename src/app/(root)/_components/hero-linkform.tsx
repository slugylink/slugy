"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import HeroLinkCard from "./hero-linkcard";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import useSWR from "swr";

const urlPattern = /^https?:\/\//;
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
      }
    ),
});

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

const fetcher = async (url: string): Promise<GetLinksResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = (await res.json()) as { error: string };
    throw new Error(error.error ?? "Failed to fetch links");
  }
  return res.json() as Promise<GetLinksResponse>;
};

const defaultLink: Link = {
  short: "slugy.co/try",
  original: "https://app.slugy.co/login",
  clicks: 526,
  expires: null,
};

const HeroLinkForm = () => {
  // State for links
  const [links, setLinks] = useState<Link[]>([defaultLink]);

  const { data, mutate } = useSWR<GetLinksResponse, Error>(
    "/api/temp/link",
    fetcher,
    {
      refreshInterval: 30000, // Reduced from 10000 to 30000 (30 seconds)
      onError: (error) => {
        // Only show error toast for non-rate-limit errors
        if (!error.message.includes("Too many requests")) {
          toast.error(error.message);
        }
      },
    }
  );

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
        const newLinks = data.links.filter(
          (newLink) =>
            !prevLinks.some(
              (existingLink) => existingLink.short === newLink.short
            )
        );

        // Update click counts for existing links
        const updatedLinks = prevLinks.map((prevLink) => {
          const updatedLink = data.links.find(
            (link) => link.short === prevLink.short
          );
          return updatedLink
            ? { ...prevLink, clicks: updatedLink.clicks }
            : prevLink;
        });

        return [...newLinks, ...updatedLinks];
      });
    }
  }, [data]);

  // Handle form submit
  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch("/api/temp/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: data.url }),
      });

      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            "You can only create 1 temporary link at a time. Please wait for it to expire or create an account for unlimited links."
          );
        }
        throw new Error(result.error ?? "Failed to create link");
      }

      setLinks((prevLinks) => [result, ...prevLinks]);
      reset();
      toast.success("Link created successfully!");
      // Revalidate the data
      void mutate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create link"
      );
    }
  };

  return (
    <div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="relative z-30 mx-auto mt-10 max-w-lg rounded-lg border bg-zinc-100 p-3 backdrop-blur-md"
      >
        <div className="flex items-center justify-center gap-2 rounded-md bg-white p-1 pr-3 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <Input
            type="text"
            className="w-full border-none bg-transparent shadow-none focus-visible:outline-none focus-visible:ring-0"
            placeholder="Enter your link"
            required
            {...register("url")}
          />
          <Button
            className="h-7 w-auto bg-orange-500 text-sm hover:bg-orange-600"
            type="submit"
            disabled={isSubmitting || links.length >= 2}
          >
            {isSubmitting && (
              <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
            )}
            Shorten
          </Button>
        </div>
      </form>
      {/* Shortened Links List */}
      <div className="mx-auto mt-4 max-w-lg space-y-3">
        {links.map((link, idx) => (
          <HeroLinkCard key={idx} link={link} />
        ))}
      </div>
      {/* Analytics/Claim Message */}
      <div className="mx-auto mt-5 max-w-sm text-center text-sm text-zinc-500">
        Want to claim your links, edit them, or view their analytics?{" "}
        <a href="https://app.slugy.co/login" className="text-black underline">
          Create a free account to get started.
        </a>
      </div>
    </div>
  );
};

export default HeroLinkForm;
