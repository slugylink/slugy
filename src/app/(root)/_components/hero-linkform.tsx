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

const API_ENDPOINT = "/api/temp";
const MAX_LINKS_DISPLAY = 2;

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

        const domainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/;
        return domainPattern.test(url);
      },
      {
        message:
          "Please enter a valid URL (e.g., https://example.com or example.com)",
      },
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

const defaultLink: Link = {
  short: "slugy.co/git",
  original: "https://github.com/slugylink/slugy",
  clicks: 650,
  expires: null,
};

const HeroLinkForm = () => {
  const [links, setLinks] = useState<Link[]>([defaultLink]);

  const { data, mutate } = useSWR<GetLinksResponse, Error>(
    API_ENDPOINT,
    fetcher,
    {
      onError: (error) => {
        if (!error.message.includes("Too many requests")) {
          toast.error(error.message);
        }
      },
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createLinkSchema),
  });

  useEffect(() => {
    if (data?.links?.length) {
      setLinks((prevLinks) => {
        const newLinks = data.links.filter(
          (newLink) =>
            !prevLinks.some(
              (existingLink) => existingLink.short === newLink.short,
            ),
        );
        const updatedLinks = prevLinks.map((prevLink) => {
          const updated = data.links.find((l) => l.short === prevLink.short);
          return updated ? { ...prevLink, clicks: updated.clicks } : prevLink;
        });
        return [...newLinks, ...updatedLinks];
      });
    }
  }, [data]);

  const onSubmit = useCallback(
    async (formData: FormData) => {
      try {
        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
