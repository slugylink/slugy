"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type * as z from "zod";
import { customAlphabet } from "nanoid";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Plus, CornerDownLeft } from "lucide-react";
import LinkFormFields from "./link-form";
import UTMBuilder from "./link-utm";
import { linkFormSchema } from "@/types/link-form";
import { mutate } from "swr";
import UrlAvatar from "../url-avatar";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import axios from "axios";
import LinkExpiration from "./link-expiration";
import LinkPassword from "./link-password";

type FormValues = z.infer<typeof linkFormSchema>;

interface LinkSettings {
  expiresAt: string | null;
  password: string | null;
  expirationUrl: string | null;
}

interface LinkResponse {
  id: string;
  url: string;
  slug: string;
  // Add other fields as needed
}

const CreateLinkForm = ({ workspaceslug }: { workspaceslug: string }) => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [utmOpen, setUtmOpen] = useState(false);
  const [linkSettings, setLinkSettings] = useState<LinkSettings>({
    expiresAt: null,
    password: null,
    expirationUrl: null,
  });
  const [utmParams, setUtmParams] = useState({
    source: "",
    medium: "",
    campaign: "",
    term: "",
    content: "",
    referral: "",
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: {
      url: "",
      domain: "slugy.co",
      slug: "",
      description: "",
      tags: [],
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting, isValid },
    getValues,
    setValue,
  } = form;

  const nanoid = customAlphabet(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    7,
  );

  const handleGenerateRandomSlug = () => {
    const randomSlug = nanoid();
    setValue("slug", randomSlug);
    setCode(randomSlug);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      function normalizeExpiresAt(val: string | Date | null | undefined) {
        if (!val) return null;
        if (val instanceof Date) return val.toISOString();
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString();
      }
      const normalizedSettings = {
        ...linkSettings,
        expiresAt: normalizeExpiresAt(linkSettings.expiresAt),
        expirationUrl: linkSettings.expirationUrl || null,
        password: linkSettings.password || null,
      };
      const utmPayload = {
        utm_source: utmParams.source || null,
        utm_medium: utmParams.medium || null,
        utm_campaign: utmParams.campaign || null,
        utm_content: utmParams.content || null,
        utm_term: utmParams.term || null,
      };
      const response = await axios.post(
        `/api/workspace/${workspaceslug}/link`,
        {
          ...data,
          ...normalizedSettings,
          ...utmPayload,
        },
      );

      if (response.status === 201) {
        const newLink = response.data as LinkResponse;

        // Update share settings in the background
        if (newLink?.id) {
          void mutate(
            (key) =>
              typeof key === "string" &&
              key.includes(`/link/${newLink.id}/share`),
            undefined,
            { revalidate: true },
          );
        }

        // Trigger revalidation for links data
        mutate(
          (key) => typeof key === "string" && key.includes("/link/get"),
          undefined,
          { revalidate: true },
        );

        toast.success("Link created successfully!");
        form.reset();
        setLinkSettings({
          expiresAt: null,
          password: null,
          expirationUrl: null,
        });
        setOpen(false);
      } else {
        const errorData = response.data as { message: string };
        toast.error(
          errorData.message || "An error occurred while creating the link.",
        );
      }
    } catch (error) {
      console.error("Error creating link:", error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          // Handle link limit reached error
          const errorData = error.response.data as {
            error: string;
            limitInfo?: {
              currentLinks: number;
              maxLinks: number;
              planType: string;
            };
          };

          if (errorData.limitInfo) {
            toast.error(
              `Link limit reached! You have ${errorData.limitInfo.currentLinks}/${errorData.limitInfo.maxLinks} links. Upgrade to Pro for more links.`,
              {
                duration: 5000,
                action: {
                  label: "Upgrade",
                  onClick: () => {
                    // Navigate to upgrade page
                    window.open("/upgrade", "_blank");
                  },
                },
              },
            );
          } else {
            toast.error(
              errorData.error || "Link limit reached. Upgrade to Pro.",
            );
          }
        } else if (error.response?.data?.message) {
          toast.error(error.response.data.message);
        } else {
          toast.error("An error occurred while creating the link.");
        }
      } else {
        toast.error("An unexpected error occurred.");
      }
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center justify-center gap-x-2">
          <Plus size={17} />
          <span className="hidden sm:inline">Create Link</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-full max-w-5xl overflow-y-auto p-0 md:p-0">
        <Form {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <div className="p-5 pt-4 pb-3">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <UrlAvatar url={form.getValues("url")} />
                  <DialogTitle className="font-medium">New link</DialogTitle>
                </div>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <LinkFormFields
                form={form}
                code={code}
                onGenerateRandomSlug={handleGenerateRandomSlug}
                workspaceslug={workspaceslug}
              />
            </div>
            <div className="mt-4 border-t border-zinc-100 bg-zinc-50 p-5 py-3.5 dark:bg-zinc-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <UTMBuilder
                    url={getValues("url")}
                    setValue={(name, value) => form.setValue("url", value)}
                    utmOpen={utmOpen}
                    setUtmOpen={setUtmOpen}
                    params={utmParams}
                    setParams={setUtmParams}
                  />
                  <LinkExpiration
                    expiration={linkSettings.expiresAt}
                    setExpiration={(expiresAt) =>
                      setLinkSettings((prev) => ({ ...prev, expiresAt }))
                    }
                    expirationUrl={linkSettings.expirationUrl}
                    setExpirationUrl={(expirationUrl) =>
                      setLinkSettings((prev) => ({ ...prev, expirationUrl }))
                    }
                  />
                  <LinkPassword
                    password={linkSettings.password}
                    setPassword={(password) =>
                      setLinkSettings((prev) => ({ ...prev, password }))
                    }
                  />
                </div>
                <Button
                  type="submit"
                  className="flex w-full items-center gap-x-2 sm:w-auto"
                  disabled={!isValid || isSubmitting}
                >
                  {isSubmitting && (
                    <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
                  )}
                  Create link <CornerDownLeft size={12} />
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLinkForm;
