"use client";
import React, { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import LinkFormFields from "./link-form";
import UTMBuilder from "./link-utm";
import { linkFormSchema, LinkFormValues, LinkData } from "@/types/link-form";
import axios from "axios";
import LinkExpiration from "./link-expiration";
import LinkPassword from "./link-password";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import UrlAvatar from "../url-avatar";
import { CornerDownLeft } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace";
import { mutate } from "swr";
import { customAlphabet } from "nanoid";
import Image from "next/image";

// Types
interface EditLinkFormProps {
  initialData: LinkData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  date: Date;
  creator: {
    name: string | null;
    image: string | null;
  } | null;
}

type UTMParams = {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  referral: string;
};

interface LinkSettings {
  expiresAt: string | null;
  password: string | null;
  expirationUrl: string | null;
}

// For SWR mutate typing
interface SWRLinksList {
  links: Array<{
    id: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

// Constants
const NANOID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const NANOID_LENGTH = 7;
const DEFAULT_DOMAIN = "slugy.co";
const UPDATE_ENDPOINT = "/update";

const EditLinkForm: React.FC<EditLinkFormProps> = React.memo(
  ({ initialData, open, onOpenChange, onClose, date, creator }) => {
    const { workspaceslug } = useWorkspaceStore();

    // Memoized nanoid generator
    const nanoid = useMemo(
      () => customAlphabet(NANOID_ALPHABET, NANOID_LENGTH),
      [],
    );

    // State management
    const [code, setCode] = useState(initialData.slug || "");
    const [utmOpen, setUtmOpen] = useState(false);
    const [linkSettings, setLinkSettings] = useState<LinkSettings>({
      expiresAt: initialData.expiresAt || null,
      password: initialData.password || null,
      expirationUrl: initialData.expirationUrl || null,
    });

    const initialParams: UTMParams = useMemo(
      () => ({
        source: initialData.utm_source || "",
        medium: initialData.utm_medium || "",
        campaign: initialData.utm_campaign || "",
        term: initialData.utm_term || "",
        content: initialData.utm_content || "",
        referral: "",
      }),
      [initialData],
    );

    const [utmParams, setUtmParams] = useState<UTMParams>(initialParams);

    const initialLinkSettings = useMemo(
      () => ({
        expiresAt: initialData.expiresAt || null,
        password: initialData.password || null,
        expirationUrl: initialData.expirationUrl || null,
      }),
      [initialData],
    );

    const [urlSafetyStatus, setUrlSafetyStatus] = useState<{
      isChecking: boolean;
      isValid: boolean | null;
      message: string;
    }>({ isChecking: false, isValid: null, message: "" });

    // Form setup
    const form = useForm<LinkFormValues>({
      resolver: zodResolver(linkFormSchema),
      defaultValues: {
        ...initialData,
        domain: initialData.domain || DEFAULT_DOMAIN,
        tags: initialData.tags || [],
      },
    });

    const {
      handleSubmit,
      formState: { isSubmitting, isValid, isDirty },
      setValue,
    } = form;

    // Memoized handlers
    const handleGenerateRandomSlug = useCallback(() => {
      const randomSlug = nanoid();
      setValue("slug", randomSlug);
      setCode(randomSlug);
    }, [nanoid, setValue]);

    // Memoized computed values
    const paramKeys = useMemo(
      () =>
        [
          "source",
          "medium",
          "campaign",
          "term",
          "content",
          "referral",
        ] as const,
      [],
    );

    const isParamsDirty = useMemo(
      () => paramKeys.some((key) => utmParams[key] !== initialParams[key]),
      [paramKeys, utmParams, initialParams],
    );

    const isLinkSettingsDirty = useMemo(
      () =>
        linkSettings.expiresAt !== initialLinkSettings.expiresAt ||
        linkSettings.password !== initialLinkSettings.password ||
        linkSettings.expirationUrl !== initialLinkSettings.expirationUrl,
      [linkSettings, initialLinkSettings],
    );

    const isAnythingDirty = useMemo(
      () => isDirty || isParamsDirty || isLinkSettingsDirty,
      [isDirty, isParamsDirty, isLinkSettingsDirty],
    );

    const isSafeToSubmit = useMemo(
      () =>
        isValid &&
        !urlSafetyStatus.isChecking &&
        urlSafetyStatus.isValid !== false &&
        isAnythingDirty,
      [
        isValid,
        urlSafetyStatus.isChecking,
        urlSafetyStatus.isValid,
        isAnythingDirty,
      ],
    );

    const [currentUrl, setCurrentUrl] = useState(initialData.url || "");

    // Update currentUrl when form values change
    React.useEffect(() => {
      const subscription = form.watch((value) => {
        setCurrentUrl(value.url || "");
      });
      return () => subscription.unsubscribe();
    }, [form]);

    // Form submission
    const onSubmit = useCallback(
      async (data: LinkFormValues) => {
        try {
          const normalizeExpiresAt = (
            val: string | Date | null | undefined,
          ) => {
            if (!val) return null;
            if (val instanceof Date) return val.toISOString();
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d.toISOString();
          };

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

          const response = await axios.patch(
            `/api/workspace/${workspaceslug}/link/${initialData.id}${UPDATE_ENDPOINT}`,
            {
              ...data,
              ...normalizedSettings,
              ...utmPayload,
            },
          );

          if (response.status === 200) {
            const updatedLink = response.data;

            // Optimistically update the SWR cache for the links list
            void mutate(`/api/workspace/${workspaceslug}/tags`);
            void mutate(
              (key) => typeof key === "string" && key.includes(`/link/get`),
              (currentData: SWRLinksList | undefined) => {
                if (!currentData || !currentData.links) return currentData;
                return {
                  ...currentData,
                  links: currentData.links.map((l) =>
                    l.id === updatedLink.id ? { ...l, ...updatedLink } : l,
                  ),
                };
              },
              false, // do not revalidate, just update cache
            );

            toast.success("Link updated successfully!");
            onClose();
          } else {
            const errorData = response.data as { message: string };
            toast.error(
              errorData.message || "An error occurred while updating the link.",
            );
          }
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.data?.message) {
            toast.error(error.response.data.message);
          } else {
            toast.error("An unexpected error occurred.");
          }
        }
      },
      [workspaceslug, initialData.id, linkSettings, utmParams, onClose],
    );

    // Memoized button content
    const submitButtonContent = useMemo(() => {
      if (isSubmitting) {
        return (
          <>
            <LoaderCircle className="mr-1 h-5 w-5 animate-spin" />
            Update link <CornerDownLeft size={12} />
          </>
        );
      }

      if (urlSafetyStatus.isValid === false) {
        return <>Unsafe URL</>;
      }

      if (!isAnythingDirty) {
        return (
          <>
            Update link <CornerDownLeft size={12} />
          </>
        );
      }

      return (
        <>
          Update link <CornerDownLeft size={12} />
        </>
      );
    }, [isSubmitting, urlSafetyStatus.isValid, isAnythingDirty]);

    // Memoized creator info
    const creatorInfo = useMemo(() => {
      if (!creator?.name && !creator?.image) {
        return null;
      }

      return (
        <div className="text-muted-foreground flex items-center gap-1.5 px-4 text-xs font-light sm:px-6">
          {creator?.image && (
            <Image
              src={creator.image}
              width={16}
              height={16}
              quality={75}
              loading="lazy"
              className="hidden cursor-pointer rounded-full border sm:inline"
              alt={creator.name ?? "Creator"}
            />
          )}
          Created by{" "}
          <span className="text-primary font-normal">
            {creator?.name ?? "Unknown"}
          </span>{" "}
          • <span>{new Date(date).toDateString()}</span>
        </div>
      );
    }, [creator, date]);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
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
                    <DialogTitle className="font-medium">Edit link</DialogTitle>
                  </div>
                </DialogHeader>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <LinkFormFields
                  form={form}
                  code={code}
                  onGenerateRandomSlug={handleGenerateRandomSlug}
                  isEditMode={true}
                  workspaceslug={workspaceslug!}
                  onSafetyStatusChange={setUrlSafetyStatus}
                />
              </div>

              {creatorInfo}

              <div className="mt-3 border-t border-zinc-100 bg-zinc-50 p-5 py-3.5 dark:bg-zinc-900">
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

EditLinkForm.displayName = "EditLinkForm";

export default EditLinkForm;
