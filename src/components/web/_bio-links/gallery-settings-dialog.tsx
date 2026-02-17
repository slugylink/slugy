"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import axios from "axios";
import { toast } from "sonner";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { mutate } from "swr";

interface GallerySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  initialData?: {
    name?: string | null;
    bio?: string | null;
    logo?: string | null;
  };
}

const formSchema = z.object({
  name: z.string().max(25, { message: "Name must be at most 25 characters" }),
  bio: z.string().max(50, { message: "Bio must be at most 50 characters" }),
});

const GallerySettingsDialog = ({
  open,
  onOpenChange,
  username,
  initialData,
}: GallerySettingsDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      bio: initialData?.bio ?? "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        name: initialData.name ?? "",
        bio: initialData.bio ?? "",
      });
    }
  }, [open, initialData, form]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (isSubmitting) return;

    // Only include fields that have changed from the initial data
    const updateData: { name?: string; bio?: string } = {};

    if (data.name !== initialData?.name) {
      updateData.name = data.name;
    }

    if (data.bio !== initialData?.bio) {
      updateData.bio = data.bio;
    }

    // If nothing has changed, don't make the API call
    if (Object.keys(updateData).length === 0) {
      toast.info("No changes to save");
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.patch(`/api/bio-gallery/${username}/update`, updateData);

      await mutate(`/api/bio-gallery/${username}`);

      toast.success("Gallery updated successfully!");
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Update error:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response data:", error.response.data);
        const errorMessage =
          (error.response.data as { error: string }).error ??
          "Failed to update gallery";
        toast.error(errorMessage);
      } else {
        toast.error("Failed to update gallery");
      }
      await mutate(`/api/bio-gallery/${username}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { isDirty, isValid } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!isSubmitting) {
          onOpenChange(newOpen);
        }
      }}
    >
      <DialogContent className="overflow-y-auto sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Gallery Settings</DialogTitle>
          <DialogDescription>Customize your gallery profile</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your name"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="flex items-center justify-between text-xs">
                      <FormMessage />
                      <span className="text-muted-foreground">
                        {field.value?.length}/25
                      </span>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="About yourself"
                        className="min-h-[10px]"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="flex items-center justify-between text-xs">
                      <FormMessage />
                      <span className="text-muted-foreground flex items-center justify-end">
                        {field.value?.length}/50
                      </span>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                disabled={!isValid || isSubmitting || !isDirty}
                type="submit"
              >
                {isSubmitting && (
                  <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
                )}{" "}
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default GallerySettingsDialog;
