"use client";
import { useState, useEffect } from "react";
import type React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Grid2X2, Link2, PanelTop, Plus, type LucideIcon } from "lucide-react";
import {
  Form,
  FormField,
  FormControl,
  FormMessage,
  FormLabel,
  FormItem,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import AppLogo from "@/components/web/app-logo";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { mutate } from "swr";
import LinkPreview from "@/components/web/_links/link-preview";
import { cn } from "@/lib/utils";

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

type GLinkStyle = "link" | "feature" | "feature-grid-2";

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
    label: "Feature",
    icon: PanelTop,
  },
  {
    value: "feature-grid-2",
    label: "Grid-2",
    icon: Grid2X2,
  },
];

interface FormData {
  title: string;
  url: string;
  secondaryTitle: string;
  secondaryUrl: string;
  style: GLinkStyle;
}

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }).max(100),
  url: z.string().url({ message: "Please enter a valid URL" }),
  secondaryTitle: z.string().max(100),
  secondaryUrl: z
    .string()
    .refine(
      (value) => value === "" || z.string().url().safeParse(value).success,
      {
        message: "Please enter a valid second URL",
      },
    ),
  style: z.enum(["link", "feature", "feature-grid-2"]),
});

export function GLinkDialogBox({
  username,
  initialData,
  open: controlledOpen,
  onOpenChange,
}: {
  username: string;
  initialData?: {
    id: string;
    title: string;
    url: string;
    style?: string | null;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEditMode = Boolean(initialData);
  const [open, setOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      url: initialData?.url ?? "",
      secondaryTitle: "",
      secondaryUrl: "",
      style: (initialData?.style as GLinkStyle) ?? "link",
    },
  });
  const {
    handleSubmit,
    reset,
    control,
    setError,
    formState: { isSubmitting, isValid, isDirty },
  } = form;
  const watchedTitle = form.watch("title");
  const watchedUrl = form.watch("url");
  const watchedSecondaryTitle = form.watch("secondaryTitle");
  const watchedSecondaryUrl = form.watch("secondaryUrl");
  const watchedStyle = form.watch("style");

  // Sync form with initialData
  useEffect(() => {
    if (initialData) {
      const formData = {
        title: initialData.title,
        url: initialData.url,
        secondaryTitle: "",
        secondaryUrl: "",
        style: (initialData.style as GLinkStyle) ?? "link",
      };
      reset(formData);
    } else {
      const formData = {
        title: "",
        url: "",
        secondaryTitle: "",
        secondaryUrl: "",
        style: "link" as GLinkStyle,
      };
      reset(formData);
    }
  }, [initialData, reset]);

  // Support controlled/uncontrolled open state
  const actualOpen = controlledOpen ?? open;
  const setActualOpen = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    else setOpen(val);
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditMode && initialData) {
        await axios.put<LinkResponse>(
          `/api/bio-gallery/${username}/link/${initialData.id}`,
          { title: data.title, url: data.url, style: data.style },
        );
      } else {
        if (data.style === "feature-grid-2") {
          if (!data.secondaryTitle.trim()) {
            setError("secondaryTitle", { message: "Second title is required" });
            return;
          }
          if (!data.secondaryUrl.trim()) {
            setError("secondaryUrl", { message: "Second URL is required" });
            return;
          }

          await axios.post<LinkResponse>(`/api/bio-gallery/${username}/link`, {
            title: data.title,
            url: data.url,
            style: data.style,
          });
          await axios.post<LinkResponse>(`/api/bio-gallery/${username}/link`, {
            title: data.secondaryTitle,
            url: data.secondaryUrl,
            style: data.style,
          });
        } else {
          await axios.post<LinkResponse>(`/api/bio-gallery/${username}/link`, {
            title: data.title,
            url: data.url,
            style: data.style,
          });
        }
      }

      toast.success(
        isEditMode
          ? "Link updated successfully!"
          : data.style === "feature-grid-2"
            ? "2 links added successfully!"
            : "Link added successfully!",
      );
      setActualOpen(false);
      reset({
        title: "",
        url: "",
        secondaryTitle: "",
        secondaryUrl: "",
        style: "link",
      });
      await mutate(`/api/bio-gallery/${username}`);
    } catch (error: unknown) {
      if (error instanceof AxiosError && error.response) {
        const apiError = error.response.data;
        if (error.response.status === 400) {
          if (Array.isArray(apiError?.errors)) {
            apiError.errors.forEach((err: { message?: string }) => {
              toast.error(err.message || "Invalid link data.");
            });
          } else if (apiError?.error) {
            toast.error(apiError.error);
          } else if (apiError?.message) {
            toast.error(apiError.message);
          } else {
            toast.error("Invalid link data.");
          }
        } else if (error.response.status === 401) {
          toast.error(apiError?.error || "You are not authorized.");
        } else if (error.response.status === 404) {
          toast.error(apiError?.error || "Gallery not found.");
        } else if (error.response.status === 403) {
          if (apiError?.code === "limit_exceeded") {
            toast.error(
              "You have reached the maximum number of links for this bio gallery.",
            );
          } else {
            toast.error(apiError?.error || "Action not allowed.");
          }
        } else {
          toast.error(
            isEditMode
              ? apiError?.error || "Error updating link. Please try again."
              : apiError?.error || "Error adding link. Please try again.",
          );
        }
      } else {
        toast.error("An unexpected error occurred.");
      }
      // Revalidate to restore the original state
      await mutate(`/api/bio-gallery/${username}`);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset(
        initialData
          ? {
              title: initialData.title,
              url: initialData.url,
              secondaryTitle: "",
              secondaryUrl: "",
              style: (initialData.style as GLinkStyle) ?? "link",
            }
          : {
              title: "",
              url: "",
              secondaryTitle: "",
              secondaryUrl: "",
              style: "link",
            },
      );
    }
    setActualOpen(newOpen);
  };

  return (
    <Dialog open={actualOpen} onOpenChange={handleOpenChange}>
      {!isEditMode && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Link
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="!max-h-[600px] overflow-y-auto sm:max-w-[512px]">
        <DialogHeader className="mx-auto flex w-full flex-col items-center justify-center">
          <DialogTitle className="justify-start pt-3 text-start">
            {isEditMode ? "Edit Link" : "Add New Link"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={control}
              name="style"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-2">
                      {GLINK_STYLE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => field.onChange(option.value)}
                          aria-pressed={field.value === option.value}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1 rounded-lg border p-3 text-center transition",
                            field.value === option.value
                              ? "border-black bg-zinc-100 dark:border-white dark:bg-zinc-800"
                              : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500",
                          )}
                        >
                          <option.icon className="size-4" />
                          <p className="text-xs font-semibold">
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

            <FormField
              control={control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {watchedStyle === "feature-grid-2" ? "Card 1 URL" : "URL"}
                  </FormLabel>
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
            <FormField
              control={control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {watchedStyle === "feature-grid-2"
                      ? "Card 1 Title"
                      : "Title"}
                  </FormLabel>
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
            {watchedStyle === "feature-grid-2" && !isEditMode && (
              <>
                <FormField
                  control={control}
                  name="secondaryUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card 2 URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/second"
                          className="border-zinc-300 dark:border-zinc-600"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="secondaryTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card 2 Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter second card title"
                          className="border-zinc-300 dark:border-zinc-600"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Preview</p>
              {watchedStyle === "link" ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold dark:bg-zinc-800">
                    URL
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {watchedTitle || "Link title"}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {watchedUrl || "https://example.com"}
                    </p>
                  </div>
                </div>
              ) : watchedStyle === "feature-grid-2" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="overflow-hidden rounded-lg border">
                    <LinkPreview
                      url={watchedUrl || ""}
                      className="!space-y-0"
                    />
                    <p className="truncate px-2 py-1 text-xs font-medium">
                      {watchedTitle || "Card 1 title"}
                    </p>
                  </div>
                  <div className="overflow-hidden rounded-lg border">
                    <LinkPreview
                      url={watchedSecondaryUrl || ""}
                      className="!space-y-0"
                    />
                    <p className="truncate px-2 py-1 text-xs font-medium">
                      {watchedSecondaryTitle || "Card 2 title"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <LinkPreview url={watchedUrl || ""} className="!space-y-0" />
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || isSubmitting || (isEditMode && !isDirty)}
            >
              {isSubmitting && (
                <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
              )}{" "}
              {isEditMode ? "Save Changes" : "Add Link"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
