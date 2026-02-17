"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { mutate } from "swr";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormControl,
  FormMessage,
  FormLabel,
  FormItem,
} from "@/components/ui/form";
import {
  ArrowUpRight,
  Link2,
  PanelTop,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { cn } from "@/lib/utils";
import UrlAvatar from "@/components/web/url-avatar";

// Types
type GLinkStyle = "link" | "feature";

interface LinkResponse {
  id: string;
  title: string;
  url: string;
  style: GLinkStyle;
  galleryId: string;
  position: number;
  clicks: number;
  isPublic: boolean;
}

interface GLinkDialogBoxProps {
  username: string;
  initialData?: {
    id: string;
    title: string;
    url: string;
    style?: string | null;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface FormData {
  title: string;
  url: string;
  style: GLinkStyle;
}

interface Metadata {
  title: string;
  image: string | null;
}

interface MetadataResponse {
  success: boolean;
  data: Metadata;
}

// Constants
const GLINK_STYLE_OPTIONS: {
  value: GLinkStyle;
  label: string;
  icon: LucideIcon;
}[] = [
  {
    value: "link",
    label: "Link Card",
    icon: Link2,
  },
  {
    value: "feature",
    label: "Feature Card",
    icon: PanelTop,
  },
];

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }).max(100),
  url: z.string().url({ message: "Please enter a valid URL" }),
  style: z.enum(["link", "feature"]),
});

const DEFAULT_FORM_VALUES: FormData = {
  title: "",
  url: "",
  style: "link",
};

const DEFAULT_LINK_IMAGE_URL =
  "https://res.cloudinary.com/dcsouj6ix/image/upload/v1771263620/default_t5ngb8.webp";

// Helper function to get form data from initial data
function getFormDataFromInitial(
  initialData?: GLinkDialogBoxProps["initialData"],
): FormData {
  if (!initialData) {
    return DEFAULT_FORM_VALUES;
  }

  return {
    title: initialData.title,
    url: initialData.url,
    style: (initialData.style as GLinkStyle) ?? "link",
  };
}

// Helper function to handle API errors
function handleApiError(error: unknown, isEditMode: boolean) {
  if (!(error instanceof AxiosError) || !error.response) {
    toast.error("An unexpected error occurred.");
    return;
  }

  const { status, data: apiError } = error.response;

  // Handle specific status codes
  if (status === 400) {
    if (Array.isArray(apiError?.errors)) {
      apiError.errors.forEach((err: { message?: string }) => {
        toast.error(err.message || "Invalid link data.");
      });
    } else {
      toast.error(apiError?.error || apiError?.message || "Invalid link data.");
    }
  } else if (status === 401) {
    toast.error(apiError?.error || "You are not authorized.");
  } else if (status === 404) {
    toast.error(apiError?.error || "Gallery not found.");
  } else if (status === 403) {
    if (apiError?.code === "limit_exceeded") {
      toast.error(
        "You have reached the maximum number of links for this bio gallery.",
      );
    } else {
      toast.error(apiError?.error || "Action not allowed.");
    }
  } else {
    const defaultMessage = isEditMode
      ? "Error updating link. Please try again."
      : "Error adding link. Please try again.";
    toast.error(apiError?.error || defaultMessage);
  }
}

export function GLinkDialogBox({
  username,
  initialData,
  open: controlledOpen,
  onOpenChange,
}: GLinkDialogBoxProps) {
  const isEditMode = Boolean(initialData);
  const [open, setOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getFormDataFromInitial(initialData),
  });

  const {
    handleSubmit,
    reset,
    control,
    watch,
    getValues,
    setValue,
    formState: { isSubmitting, isValid, isDirty },
  } = form;

  // Watch form values for preview
  const watchedTitle = watch("title");
  const watchedUrl = watch("url");
  const watchedStyle = watch("style");
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Sync form with initialData
  useEffect(() => {
    reset(getFormDataFromInitial(initialData));
  }, [initialData, reset]);

  useEffect(() => {
    const trimmedUrl = watchedUrl.trim();

    if (!trimmedUrl) {
      setMetadata(null);
      setMetadataError(null);
      setMetadataLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      void (async () => {
        try {
          setMetadataLoading(true);
          setMetadataError(null);

          const response = await fetch(
            `/api/metadata?url=${encodeURIComponent(trimmedUrl)}`,
            { signal: controller.signal },
          );

          if (!response.ok) {
            throw new Error("Failed to fetch metadata");
          }

          const json = (await response.json()) as MetadataResponse;
          setMetadata(json.data ?? null);

          const metadataTitle = json.data?.title?.trim();
          if (metadataTitle && !getValues("title").trim()) {
            setValue("title", metadataTitle, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }
        } catch (error) {
          if ((error as Error).name === "AbortError") return;
          setMetadata(null);
          setMetadataError("Unable to load metadata.");
        } finally {
          setMetadataLoading(false);
        }
      })();
    }, 350);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [watchedUrl, getValues, setValue]);

  // Support controlled/uncontrolled open state
  const actualOpen = controlledOpen ?? open;
  const setActualOpen = useCallback(
    (val: boolean) => {
      if (onOpenChange) {
        onOpenChange(val);
      } else {
        setOpen(val);
      }
    },
    [onOpenChange],
  );

  const onSubmit = useCallback(
    async (data: FormData) => {
      try {
        const apiUrl =
          isEditMode && initialData
            ? `/api/bio-gallery/${username}/link/${initialData.id}`
            : `/api/bio-gallery/${username}/link`;

        const apiMethod = isEditMode ? axios.put : axios.post;

        await apiMethod<LinkResponse>(apiUrl, {
          title: data.title,
          url: data.url,
          style: data.style,
          image: metadata?.image ?? null,
        });

        toast.success(
          isEditMode
            ? "Link updated successfully!"
            : "Link added successfully!",
        );

        setActualOpen(false);
        reset(DEFAULT_FORM_VALUES);
        await mutate(`/api/bio-gallery/${username}`);
      } catch (error: unknown) {
        handleApiError(error, isEditMode);
        // Revalidate to restore the original state
        await mutate(`/api/bio-gallery/${username}`);
      }
    },
    [isEditMode, initialData, metadata, username, reset, setActualOpen],
  );

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        reset(getFormDataFromInitial(initialData));
        setMetadata(null);
        setMetadataError(null);
        setMetadataLoading(false);
      }
      setActualOpen(newOpen);
    },
    [initialData, reset, setActualOpen],
  );

  const linkPreview = useMemo(
    () => (
      <div
        className="group bg-background flex w-full items-center gap-2.5 overflow-hidden rounded-xl border px-5 py-4 text-left text-base font-medium backdrop-blur"
        aria-label={`Visit ${watchedTitle || watchedUrl || "link"}`}
      >
        <UrlAvatar url={watchedUrl || "https://example.com"} />
        <span className="block min-w-0 flex-1 truncate">
          {watchedTitle || watchedUrl || "Link title"}
        </span>
        <span className="bg-background flex size-9 shrink-0 items-center justify-center rounded-full border text-zinc-300 transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-400">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    ),
    [watchedTitle, watchedUrl],
  );

  const featurePreview = useMemo(
    () => (
      <div className="overflow-hidden rounded-lg border">
        <div className="relative w-full overflow-hidden rounded-lg">
          {metadataLoading ? (
            <>
              <div className="flex aspect-video items-center justify-center">
                <LoaderCircle className="h-5 w-5 animate-spin text-zinc-500" />
              </div>
              <div className="space-y-1 border-t bg-zinc-50 p-2 dark:bg-zinc-900">
                <h2 className="line-clamp-1 text-xs font-semibold">
                  Loading metadata...
                </h2>
              </div>
            </>
          ) : !watchedUrl.trim() ? (
            <>
              <div className="flex aspect-video items-center justify-center">
                <span className="text-muted-foreground text-center text-sm">
                  Enter a link to generate <br /> a preview
                </span>
              </div>
            </>
          ) : metadataError ? (
            <>
              <div className="flex aspect-video items-center justify-center">
                <p className="text-muted-foreground text-sm">{metadataError}</p>
              </div>
              <div className="space-y-1 border-t bg-zinc-50 p-2 dark:bg-zinc-900">
                <h2 className="line-clamp-1 text-xs font-semibold">
                  Error loading metadata
                </h2>
              </div>
            </>
          ) : (
            <>
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-t-lg">
                <div className="absolute top-4 left-4 z-20">
                  <UrlAvatar
                    url={watchedUrl || "https://example.com"}
                    className="bg-white"
                  />
                </div>
                <div className="absolute inset-0 z-10 bg-linear-to-t from-black/70 via-black/5 to-transparent" />

                <img
                  src={metadata?.image ?? DEFAULT_LINK_IMAGE_URL}
                  alt={metadata?.title || watchedTitle || "Link preview image"}
                  className="aspect-video h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />

                <p className="text-md absolute inset-x-0 bottom-2.5 z-10 line-clamp-1 px-4 text-center leading-tight font-semibold text-white drop-shadow-sm md:text-lg">
                  {watchedTitle || metadata?.title || "Link title"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    ),
    [metadata, metadataError, metadataLoading, watchedTitle, watchedUrl],
  );

  return (
    <Dialog open={actualOpen} onOpenChange={handleOpenChange}>
      {!isEditMode && (
        <DialogTrigger asChild>
          <Button className="w-full gap-2 rounded-sm border-y">
            <Plus className="h-4 w-4" />
            Add Link
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="scrollbar-hide !max-h-[600px] overflow-y-auto px-5 sm:max-w-[480px]">
        <DialogHeader className="mx-auto flex w-full flex-col items-center justify-center">
          <DialogTitle className="justify-start pt-3 text-start">
            {isEditMode ? "Edit Link" : "Add New Link"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-3 overflow-x-hidden"
          >
            {/* Style Selection */}
            <FormField
              control={control}
              name="style"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-2">
                      {GLINK_STYLE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => field.onChange(option.value)}
                          aria-pressed={field.value === option.value}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1 rounded-lg border p-3 text-center transition-all duration-200 ease-in-out",
                            field.value === option.value
                              ? "border-black bg-zinc-100 shadow-sm dark:border-white dark:bg-zinc-800"
                              : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:bg-zinc-900/70",
                          )}
                        >
                          <option.icon
                            className={cn(
                              "size-4 transition-transform duration-200 ease-in-out",
                              field.value === option.value
                                ? "scale-110"
                                : "scale-100",
                            )}
                          />
                          <p
                            className={cn(
                              "text-xs font-semibold transition-colors duration-200 ease-in-out",
                              field.value === option.value
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {option.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* URL Input */}
            <FormField
              control={control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com"
                      className="border-zinc-300 dark:border-zinc-600"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title Input */}
            <FormField
              control={control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter link title"
                      className="border-zinc-300 dark:border-zinc-600"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview</p>
              <div className="relative overflow-hidden transition-all duration-300 ease-in-out">
                <div
                  className={cn(
                    "transition-all duration-300 ease-in-out",
                    watchedStyle === "link"
                      ? "relative z-10 scale-100 opacity-100"
                      : "pointer-events-none absolute inset-0 z-0 scale-95 opacity-0",
                  )}
                >
                  {linkPreview}
                </div>
                <div
                  className={cn(
                    "transition-all duration-300 ease-in-out",
                    watchedStyle === "feature"
                      ? "relative z-10 scale-100 opacity-100"
                      : "pointer-events-none absolute inset-0 z-0 scale-95 opacity-0",
                  )}
                >
                  {featurePreview}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || isSubmitting || (isEditMode && !isDirty)}
            >
              {isSubmitting && (
                <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
              )}
              {isEditMode ? "Save Changes" : "Add Link"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
