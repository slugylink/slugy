"use client";
import { useState, useEffect } from "react";
import type React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
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

interface LinkResponse {
  id: string;
  title: string;
  url: string;
  galleryId: string;
  position: number;
  clicks: number;
  isPublic: boolean;
}


interface FormData {
  title: string;
  url: string;
}

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }).max(100),
  url: z.string().url({ message: "Please enter a valid URL" }),
});

export function GLinkDialogBox({
  username,
  initialData,
  open: controlledOpen,
  onOpenChange,
}: {
  username: string;
  initialData?: { id: string; title: string; url: string };
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
    },
  });
  const {
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, isValid },
  } = form;

  // Sync form with initialData
  useEffect(() => {
    if (initialData) {
      reset({ title: initialData.title, url: initialData.url });
    } else {
      reset({ title: "", url: "" });
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
      let response;
      if (isEditMode && initialData) {
        // Optimistically update the UI for edit
        response = await axios.put<LinkResponse>(
          `/api/bio-gallery/${username}/link/${initialData.id}`,
          { title: data.title, url: data.url },
        );
      } else {
        response = await axios.post<LinkResponse>(
          `/api/bio-gallery/${username}/link`,
          { title: data.title, url: data.url },
        );
      }

      if (response.status === 200) {
        toast.success(
          isEditMode
            ? "Link updated successfully!"
            : "Link added successfully!",
        );
        setActualOpen(false);
        reset();
        // Revalidate to get the latest data
        await mutate(`/api/bio-gallery/${username}`);
      }
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
            toast.error("You have reached the maximum number of links for this bio gallery.");
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
          ? { title: initialData.title, url: initialData.url }
          : { title: "", url: "" },
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="mx-auto flex w-full items-center justify-center">
          <AppLogo />
          <DialogTitle className="pt-3 text-center">
            {isEditMode ? "Edit Link" : "Add New Link"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isEditMode
              ? "Edit your link details"
              : "Add a new link to your gallery"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || isSubmitting}
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
