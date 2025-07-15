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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import { Upload } from "lucide-react";
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
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null | undefined>(
    initialData?.logo,
  );

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
      setLogoUrl(initialData.logo);
    }
  }, [open, initialData, form]);

  // Handle logo upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/bio-gallery/${username}/update/logo`, {
        method: "PATCH",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as { logo: string | null };

      await mutate(`/api/bio-gallery/${username}`);

      setLogoUrl(data.logo);
      toast.success("Logo uploaded!");
    } catch (err) {
      toast.error("Failed to upload logo");
      await mutate(`/api/bio-gallery/${username}`);
    } finally {
      setIsUploading(false);
    }
  };

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
            {/* Profile Section */}
            <div className="space-y-4">
              <div className="flex flex-col items-start gap-2">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage
                      className="object-cover"
                      src={logoUrl ?? "/placeholder-avatar.jpg"}
                    />
                    <AvatarFallback>
                      {username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="relative"
                      disabled={isUploading || isSubmitting}
                    >
                      {isUploading ? (
                        <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload
                        </>
                      )}
                      <input
                        type="file"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={handleImageUpload}
                        accept="image/png,image/jpeg"
                        disabled={isUploading || isSubmitting}
                      />
                    </Button>
                  </div>
                </div>
                <div className="text-muted-foreground text-sm">
                  Recommended: Square image (200KB max)
                </div>
              </div>

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
                        {field.value.length}/25
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
                        {field.value.length}/50
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
