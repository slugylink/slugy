"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useRouter } from "next/navigation";
import {
  RiFacebookFill,
  RiInstagramLine,
  RiLinkedinFill,
  RiTwitterXFill,
  RiYoutubeFill,
  RiSnapchatFill,
} from "react-icons/ri";
import { LuMail } from "react-icons/lu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { mutate } from "swr";

interface Social {
  platform: string;
  url?: string;
  isPublic?: boolean;
}

const formSchema = z.object({
  facebook: z.string().url().or(z.string().length(0)).optional(),
  instagram: z.string().url().or(z.string().length(0)).optional(),
  linkedin: z.string().url().or(z.string().length(0)).optional(),
  twitter: z.string().url().or(z.string().length(0)).optional(),
  youtube: z.string().url().or(z.string().length(0)).optional(),
  mail: z.string().email().or(z.string().length(0)).optional(),
  snapchat: z.string().or(z.string().length(0)).optional(),
});

interface SocialSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  initialData?: Social[];
}

export function SocialSettingsDialog({
  open,
  onOpenChange,
  username,
  initialData,
}: SocialSettingsDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      facebook: "",
      instagram: "",
      linkedin: "",
      twitter: "",
      youtube: "",
      mail: "",
      snapchat: "",
    },
    mode: "onChange",
  });

  // Add isPublic state for each social
  const [isFacebookPublic, setIsFacebookPublic] = useState(false);
  const [isInstagramPublic, setIsInstagramPublic] = useState(false);
  const [isLinkedinPublic, setIsLinkedinPublic] = useState(false);
  const [isTwitterPublic, setIsTwitterPublic] = useState(false);
  const [isYoutubePublic, setIsYoutubePublic] = useState(false);
  const [isMailPublic, setIsMailPublic] = useState(false);
  const [isSnapchatPublic, setIsSnapchatPublic] = useState(false);

  // Track if form has changed from initial state
  const [isDirty, setIsDirty] = useState(false);

  // Sync initialData to form and switches
  useEffect(() => {
    if (initialData && open) {
      const fb = initialData.find((s) => s.platform === "facebook");
      const ig = initialData.find((s) => s.platform === "instagram");
      const li = initialData.find((s) => s.platform === "linkedin");
      const tw = initialData.find((s) => s.platform === "twitter");
      const yt = initialData.find((s) => s.platform === "youtube");
      const mail = initialData.find((s) => s.platform === "mail");
      const sc = initialData.find((s) => s.platform === "snapchat");

      form.reset({
        facebook: fb?.url ?? "",
        instagram: ig?.url ?? "",
        linkedin: li?.url ?? "",
        twitter: tw?.url ?? "",
        youtube: yt?.url ?? "",
        mail: mail?.url ?? "",
        snapchat: sc?.url ?? "",
      });

      setIsFacebookPublic(!!fb?.isPublic);
      setIsInstagramPublic(!!ig?.isPublic);
      setIsLinkedinPublic(!!li?.isPublic);
      setIsTwitterPublic(!!tw?.isPublic);
      setIsYoutubePublic(!!yt?.isPublic);
      setIsMailPublic(!!mail?.isPublic);
      setIsSnapchatPublic(!!sc?.isPublic);

      // Reset dirty state when dialog opens with new data
      setIsDirty(false);
    }
  }, [initialData, form, open]);

  // Track changes to form values and switches
  useEffect(() => {
    const subscription = form.watch(() => {
      setIsDirty(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Track changes to switches
  useEffect(() => {
    if (open) {
      const initialFb =
        initialData?.find((s) => s.platform === "facebook")?.isPublic ?? false;
      const initialIg =
        initialData?.find((s) => s.platform === "instagram")?.isPublic ?? false;
      const initialLi =
        initialData?.find((s) => s.platform === "linkedin")?.isPublic ?? false;
      const initialTw =
        initialData?.find((s) => s.platform === "twitter")?.isPublic ?? false;
      const initialYt =
        initialData?.find((s) => s.platform === "youtube")?.isPublic ?? false;
      const initialMail =
        initialData?.find((s) => s.platform === "mail")?.isPublic ?? false;
      const initialSc =
        initialData?.find((s) => s.platform === "snapchat")?.isPublic ?? false;

      if (
        isFacebookPublic !== initialFb ||
        isInstagramPublic !== initialIg ||
        isLinkedinPublic !== initialLi ||
        isTwitterPublic !== initialTw ||
        isYoutubePublic !== initialYt ||
        isMailPublic !== initialMail ||
        isSnapchatPublic !== initialSc
      ) {
        setIsDirty(true);
      }
    }
  }, [
    isFacebookPublic,
    isInstagramPublic,
    isLinkedinPublic,
    isTwitterPublic,
    isYoutubePublic,
    isMailPublic,
    isSnapchatPublic,
    initialData,
    open,
  ]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const socials = [
        {
          platform: "facebook",
          url: data.facebook,
          isPublic: isFacebookPublic,
        },
        {
          platform: "instagram",
          url: data.instagram,
          isPublic: isInstagramPublic,
        },
        {
          platform: "linkedin",
          url: data.linkedin,
          isPublic: isLinkedinPublic,
        },
        { platform: "twitter", url: data.twitter, isPublic: isTwitterPublic },
        { platform: "youtube", url: data.youtube, isPublic: isYoutubePublic },
        { platform: "mail", url: data.mail, isPublic: isMailPublic },
        {
          platform: "snapchat",
          url: data.snapchat,
          isPublic: isSnapchatPublic,
        },
      ].filter((s) => s.url && s.url.length > 0);

      // Optimistically update the UI
      await mutate(`/api/bio-gallery/${username}`);

      const response = await fetch(`/api/bio-gallery/${username}/update/socials`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socials }),
      });

      if (!response.ok) {
        throw new Error("Failed to update social links");
      }

      // Update with server response
      await mutate(`/api/bio-gallery/${username}`);

      toast.success("Social links updated successfully");
      onOpenChange(false);
      setIsDirty(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update social links");
      // Revalidate to restore the original state
      await mutate(`/api/bio-gallery/${username}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!isSubmitting) {
          onOpenChange(newOpen);
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Social Media Links</DialogTitle>
          <DialogDescription>
            Add your social media profiles to your gallery
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="facebook"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <RiFacebookFill className="h-5 w-5" />
                    <FormControl>
                      <Input
                        placeholder="Facebook profile URL"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <Switch
                      checked={isFacebookPublic}
                      onCheckedChange={setIsFacebookPublic}
                      disabled={isSubmitting}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instagram"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <RiInstagramLine className="h-5 w-5" />
                    <FormControl>
                      <Input
                        placeholder="Instagram profile URL"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <Switch
                      checked={isInstagramPublic}
                      onCheckedChange={setIsInstagramPublic}
                      disabled={isSubmitting}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="linkedin"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <RiLinkedinFill className="h-5 w-5" />
                    <FormControl>
                      <Input
                        placeholder="LinkedIn profile URL"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <Switch
                      checked={isLinkedinPublic}
                      onCheckedChange={setIsLinkedinPublic}
                      disabled={isSubmitting}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="twitter"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <RiTwitterXFill className="h-5 w-5" />
                    <FormControl>
                      <Input
                        placeholder="Twitter profile URL"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <Switch
                      checked={isTwitterPublic}
                      onCheckedChange={setIsTwitterPublic}
                      disabled={isSubmitting}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="youtube"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <RiYoutubeFill className="h-5 w-5" />
                    <FormControl>
                      <Input
                        placeholder="YouTube channel URL"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <Switch
                      checked={isYoutubePublic}
                      onCheckedChange={setIsYoutubePublic}
                      disabled={isSubmitting}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mail"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <LuMail className="h-5 w-5" />
                    <FormControl>
                      <Input
                        placeholder="Email address"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <Switch
                      checked={isMailPublic}
                      onCheckedChange={setIsMailPublic}
                      disabled={isSubmitting}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="snapchat"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <RiSnapchatFill className="h-5 w-5" />
                    <FormControl>
                      <Input
                        placeholder="Snapchat username"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <Switch
                      checked={isSnapchatPublic}
                      onCheckedChange={setIsSnapchatPublic}
                      disabled={isSubmitting}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                disabled={!form.formState.isValid || isSubmitting || !isDirty}
                type="submit"
              >
                {isSubmitting && (
                  <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
                )}
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
