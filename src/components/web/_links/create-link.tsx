"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
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
import { useRouter } from "next/navigation";

// Types
type FormValues = z.infer<typeof linkFormSchema>;

interface LinkSettings {
  expiresAt: string | null;
  password: string | null;
  expirationUrl: string | null;
}

interface UTMParams {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  referral: string;
}

interface UrlSafetyStatus {
  isChecking: boolean;
  isValid: boolean | null;
  message: string;
}

// Constants
const NANOID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const NANOID_LENGTH = 7;
const DEFAULT_DOMAIN = "slugy.co";

// Utility functions
const normalizeExpiresAt = (
  val: string | Date | null | undefined,
): string | null => {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

// Memoized nanoid generator
const useNanoid = () =>
  useMemo(() => customAlphabet(NANOID_ALPHABET, NANOID_LENGTH), []);

const CreateLinkForm = React.memo(
  ({ workspaceslug }: { workspaceslug: string }) => {
    const router = useRouter();
    const nanoid = useNanoid();

    // State management
    const [open, setOpen] = useState(false);
    const [code, setCode] = useState("");
    const [utmOpen, setUtmOpen] = useState(false);
    const [linkSettings, setLinkSettings] = useState<LinkSettings>({
      expiresAt: null,
      password: null,
      expirationUrl: null,
    });
    const [utmParams, setUtmParams] = useState<UTMParams>({
      source: "",
      medium: "",
      campaign: "",
      term: "",
      content: "",
      referral: "",
    });
    // Draft (local-only) link preview metadata while creating
    const [draftMetadata, setDraftMetadata] = useState<{
      image: string | null;
      title: string | null;
      metadesc: string | null;
      imagePreview?: string | null;
      selectedFile?: File | null;
    }>({ image: null, title: null, metadesc: null });
    const [urlSafetyStatus, setUrlSafetyStatus] = useState<UrlSafetyStatus>({
      isChecking: false,
      isValid: null,
      message: "",
    });

    // Form setup
    const form = useForm<FormValues>({
      resolver: zodResolver(linkFormSchema),
      defaultValues: {
        url: "",
        domain: DEFAULT_DOMAIN,
        slug: "",
        description: "",
        tags: [],
      },
    });

    const {
      handleSubmit,
      formState: { isSubmitting, isValid },
      setValue,
      reset,
    } = form;

    // Memoized computed values
    const isSafeToSubmit = useMemo(
      () =>
        isValid &&
        !urlSafetyStatus.isChecking &&
        urlSafetyStatus.isValid !== false,
      [isValid, urlSafetyStatus.isChecking, urlSafetyStatus.isValid],
    );

    const [currentUrl, setCurrentUrl] = useState("");

    // Watch form URL changes with debouncing to prevent UI freezing
    useEffect(() => {
      let timeoutId: NodeJS.Timeout;
      
      const subscription = form.watch((value) => {
        // Debounce URL updates to prevent excessive re-renders
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setCurrentUrl(value.url || "");
        }, 100);
      });
      
      return () => {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
      };
    }, [form]);

    // Memoized handlers
    const handleGenerateRandomSlug = useCallback(() => {
      const randomSlug = nanoid();
      setValue("slug", randomSlug);
      setCode(randomSlug);
    }, [nanoid, setValue]);


    const resetForm = useCallback(() => {
      reset();
      setLinkSettings({
        expiresAt: null,
        password: null,
        expirationUrl: null,
      });
      setUtmParams({
        source: "",
        medium: "",
        campaign: "",
        term: "",
        content: "",
        referral: "",
      });
      setCode("");
      setDraftMetadata({ image: null, title: null, metadesc: null });
    }, [reset]);

    const handleClose = useCallback(() => {
      setOpen(false);
      resetForm();
    }, [resetForm]);

    // Form submission
    const onSubmit = useCallback(
      async (data: FormValues) => {
        try {
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
              // Persist draft preview (server expects metadesc in create route after we update it)
              title: draftMetadata.title || null,
              metadesc: draftMetadata.metadesc || null,
              image: draftMetadata.image || null,
              ...normalizedSettings,
              ...utmPayload,
            },
          );

          if (response.status === 201) {
            const created = response.data as { id: string };
            // If user picked a file for preview image, upload now and patch link
            if (draftMetadata.selectedFile) {
              try {
                const formData = new FormData();
                formData.append("file", draftMetadata.selectedFile);
                const uploadRes = await axios.post(
                  `/api/workspace/${workspaceslug}/link/${created.id}/upload-image`,
                  formData,
                  { headers: { "Content-Type": "multipart/form-data" } },
                );
                const imageUrl = uploadRes.data.url as string;
                await axios.patch(
                  `/api/workspace/${workspaceslug}/link/${created.id}/update`,
                  { image: imageUrl },
                );
              } catch (e) {
                // Non-blocking: creation succeeded; notify upload failure only
                console.error("Preview image upload failed:", e);
                toast.error("Preview image upload failed. You can try editing later.");
              }
            }

            toast.success("Link created successfully!");

            // Optimistically update cache
            await mutate(
              (key) => typeof key === "string" && key.includes("/link/get"),
              undefined,
              { revalidate: true },
            );

            resetForm();
            router.refresh();
            handleClose();
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
                      onClick: () => window.open("/upgrade", "_blank"),
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
      },
      [
        workspaceslug,
        linkSettings,
        utmParams,
        resetForm,
        handleClose,
        router,
        draftMetadata,
      ],
    );

    // Memoized button content
    const submitButtonContent = useMemo(() => {
      if (isSubmitting) {
        return (
          <>
            <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
            Create link <CornerDownLeft size={12} />
          </>
        );
      }

      if (urlSafetyStatus.isValid === false) {
        return <>Unsafe URL <CornerDownLeft size={12} /></>;
      }

      return <>Create link <CornerDownLeft size={12} /></>;
    }, [isSubmitting, urlSafetyStatus.isValid]);

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
                    <UrlAvatar url={currentUrl} />
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
                  onSafetyStatusChange={setUrlSafetyStatus}
                  draftMetadata={draftMetadata}
                  onDraftMetadataSave={(draft) => setDraftMetadata(draft)}
                />
              </div>

              <div className="mt-4 border-t border-zinc-100 bg-zinc-50 p-5 py-3.5 dark:bg-zinc-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <UTMBuilder
                      url={currentUrl}
                      setValue={(name, value) => setValue("url", value)}
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
                    disabled={!isSafeToSubmit || isSubmitting}
                  >
                    {submitButtonContent}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  },
);

CreateLinkForm.displayName = "CreateLinkForm";

export default CreateLinkForm;
