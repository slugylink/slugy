"use client";

import React, { useState, useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import axios from "axios";
import useSWR, { mutate } from "swr";
import { cn } from "@/lib/utils";
import { validateUrlSafety } from "@/server/actions/url-scan";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Loader2,
  Shuffle,
  Shield,
  ShieldAlert,
  Tag,
  Check,
  Plus,
  Lock,
  LoaderIcon,
} from "lucide-react";
import { BsStars } from "react-icons/bs";
import LinkQrCode from "./link-qrcode";
import LinkPreview from "./link-preview";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LinkFormValues, LinkData } from "@/types/link-form";
import { COLOR_OPTIONS } from "@/constants/tag-colors";
import { EditIcon } from "@/utils/icons/edit";
import QRCodeDesign from "@/components/web/qr-code-design";
import LinkCustomMetadata from "./link-custome-metadata";

// Types
interface LinkFormFieldsProps {
  form: UseFormReturn<LinkFormValues>;
  code: string;
  onGenerateRandomSlug: () => void;
  isEditMode?: boolean;
  workspaceslug?: string;
  linkId?: string;
  onSafetyStatusChange?: (status: {
    isChecking: boolean;
    isValid: boolean | null;
    message: string;
  }) => void;
  // For create flow: allow in-memory preview edits
  draftMetadata?: {
    image: string | null;
    title: string | null;
    metadesc: string | null;
    imagePreview?: string | null;
    selectedFile?: File | null;
  };
  onDraftMetadataSave?: (draft: {
    image: string | null;
    title: string | null;
    metadesc: string | null;
    imagePreview?: string | null;
    selectedFile?: File | null;
  }) => void;
}

interface TagType {
  id: string;
  name: string;
  color: string | null;
  linkCount: number;
}

interface UrlSafetyStatus {
  isChecking: boolean;
  isValid: boolean | null;
  message: string;
}

// Constants
const AI_SLUG_ENDPOINT = "/api/ai/link-slug";
const RANDOM_SLUG_DELAY_MS = 300;
const DEFAULT_DOMAIN = "slugy.co";
const URL_DEBOUNCE_MS = 500;
const SAFETY_CHECK_DEBOUNCE_MS = 1000;

// Memoized components
const SafetyIndicator = ({ status }: { status: UrlSafetyStatus }) => {
  if (status.isChecking) {
    return (
      <div className="text-muted-foreground flex items-center gap-1 text-sm">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </div>
    );
  }

  if (status.isValid === true) {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600">
        <Shield className="h-3.5 w-3.5" />
      </div>
    );
  }

  if (status.isValid === false) {
    return (
      <div className="flex items-center gap-1 text-xs text-red-600">
        <ShieldAlert className="h-3.5 w-3.5" />
      </div>
    );
  }

  return (
    <div className="text-muted-foreground flex items-center gap-1 text-sm">
      <Shield className="h-3.5 w-3.5" />
    </div>
  );
};

const TagBadge = ({ tag }: { tag: TagType }) => {
  const colorOption =
    COLOR_OPTIONS.find((color) => color.value === tag.color) ||
    COLOR_OPTIONS[0]!;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "flex items-center gap-1 rounded-sm px-1 py-[1px] text-xs font-normal",
        colorOption.bgColor,
        colorOption.borderColor,
      )}
    >
      {tag.name}
    </Badge>
  );
};

const LinkFormFields = ({
  form,
  code,
  onGenerateRandomSlug,
  isEditMode = false,
  workspaceslug,
  linkId,
  onSafetyStatusChange,
  draftMetadata,
  onDraftMetadataSave,
}: LinkFormFieldsProps) => {
  const { control, getValues, watch, setValue } = form;

  // State management
  const [currentCode, setCurrentCode] = useState(code);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRandomLoading, setIsRandomLoading] = useState(false);
  const [isAddTagLoading, setIsAddTagLoading] = useState(false);
  const [urlSafetyStatus, setUrlSafetyStatus] = useState<UrlSafetyStatus>({
    isChecking: false,
    isValid: null,
    message: "",
  });
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [isSlugEditable, setIsSlugEditable] = useState(!isEditMode);
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false);
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const [qrCodeKey, setQrCodeKey] = useState(0); // Force re-render after save
  const slugInputRef = useRef<HTMLInputElement | null>(null);

  // Debounce refs
  const urlValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const safetyCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Form values
  const domain = watch("domain");
  const slug = watch("slug");
  const url = watch("url");

  // Instant URL for safety checking
  const instantUrl = url;

  // URL validation state
  const [urlValidation, setUrlValidation] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: true, message: "" });

  // Fetch tags for workspace
  const {
    data: tags,
    error: tagsError,
    isLoading: tagsLoading,
  } = useSWR<TagType[]>(
    workspaceslug ? `/api/workspace/${workspaceslug}/tags` : null,
  );

  // Fetch custom domains for workspace
  const { data: domainsData, isLoading: domainsLoading } = useSWR<{
    domains: Array<{
      id: string;
      domain: string;
      verified: boolean;
      dnsConfigured: boolean;
    }>;
  }>(workspaceslug ? `/api/workspace/${workspaceslug}/domains` : null);

  // Computed values
  const currentTags = getValues("tags") || [];
  const selectedTagObjects =
    tags?.filter((tag) => selectedTags.includes(tag.id)) || [];

  // Filter only verified and configured custom domains
  const availableDomains = (() => {
    const domains: Array<{
      value: string;
      label: string;
      id: string | null;
    }> = [{ value: DEFAULT_DOMAIN, label: DEFAULT_DOMAIN, id: null }];

    if (domainsData?.domains) {
      const customDomains = domainsData.domains
        .filter((d) => d.verified && d.dnsConfigured)
        .map((d) => ({ value: d.domain, label: d.domain, id: d.id }));
      domains.push(...customDomains);
    }

    return domains;
  })();

  const filteredTags =
    tags?.filter((tag) =>
      tag.name.toLowerCase().includes(searchValue.toLowerCase()),
    ) || [];

  const canAddNew =
    searchValue &&
    tags &&
    !tags.some((tag) => tag.name.toLowerCase() === searchValue.toLowerCase());

  // Handlers
  const validateUrlFormat = (rawUrl: string) => {
    if (!rawUrl.trim()) {
      return { isValid: true, message: "" };
    }

    try {
      const url = new URL(
        rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`,
      );
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return {
          isValid: false,
          message: "URL must use HTTP or HTTPS protocol",
        };
      }
      if (!url.hostname || url.hostname.length < 3) {
        return { isValid: false, message: "Invalid domain name" };
      }
      return { isValid: true, message: "" };
    } catch {
      // Try with https prefix if it doesn't have protocol
      if (!rawUrl.startsWith("http") && rawUrl.includes(".")) {
        try {
          new URL(`https://${rawUrl}`);
          return { isValid: true, message: "" };
        } catch {
          return { isValid: false, message: "Invalid URL format" };
        }
      }
      return { isValid: false, message: "Invalid URL format" };
    }
  };

  const normalizeUrl = (rawUrl: string): string => {
    if (!rawUrl) return rawUrl;
    if (/^https?:\/\//.test(rawUrl)) return rawUrl;
    if (
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(rawUrl) ||
      rawUrl.startsWith("www.")
    ) {
      return `https://${rawUrl}`;
    }
    return rawUrl;
  };

  const enableSlugEditing = () => {
    if (!isSlugEditable) {
      setIsSlugEditable(true);
      // Focus after enabling to help the user edit immediately
      setTimeout(() => slugInputRef.current?.focus(), 0);
    } else {
      // Already editable; focus it
      slugInputRef.current?.focus();
    }
  };

  const checkUrlSafety = async (checkUrl: string) => {
    if (!checkUrl) {
      const status = { isChecking: false, isValid: null, message: "" };
      setUrlSafetyStatus(status);
      onSafetyStatusChange?.(status);
      return;
    }

    const checkingStatus = { isChecking: true, isValid: null, message: "" };
    setUrlSafetyStatus(checkingStatus);
    onSafetyStatusChange?.(checkingStatus);

    try {
      const normalizedUrl = normalizeUrl(checkUrl);
      const result = await validateUrlSafety(normalizedUrl);
      const finalStatus = {
        isChecking: false,
        isValid: result.isValid,
        message: result.message || "",
      };
      setUrlSafetyStatus(finalStatus);
      onSafetyStatusChange?.(finalStatus);
    } catch (error) {
      console.error("Error checking URL safety:", error);
      const safeStatus = { isChecking: false, isValid: true, message: "" };
      setUrlSafetyStatus(safeStatus);
      onSafetyStatusChange?.(safeStatus);
    }
  };

  // Debounced URL safety check
  const debouncedCheckUrlSafety = (checkUrl: string) => {
    // Clear existing timeout
    if (safetyCheckTimeoutRef.current) {
      clearTimeout(safetyCheckTimeoutRef.current);
    }

    // Set new timeout
    safetyCheckTimeoutRef.current = setTimeout(() => {
      checkUrlSafety(checkUrl);
    }, SAFETY_CHECK_DEBOUNCE_MS);
  };

  // Debounced URL validation
  const debouncedValidateUrl = (rawUrl: string) => {
    // Clear existing timeout
    if (urlValidationTimeoutRef.current) {
      clearTimeout(urlValidationTimeoutRef.current);
    }

    // Set new timeout
    urlValidationTimeoutRef.current = setTimeout(() => {
      const validation = validateUrlFormat(rawUrl);
      setUrlValidation(validation);
    }, URL_DEBOUNCE_MS);
  };

  const handleAiRandomize = async (rawUrl: string) => {
    if (!rawUrl) return;
    setIsAiLoading(true);
    try {
      const normalizedUrl = normalizeUrl(rawUrl);
      const res = await axios.post(AI_SLUG_ENDPOINT, {
        url: normalizedUrl,
      });
      const data = res.data as { slug: string };
      setValue("slug", data.slug, { shouldDirty: true });
    } catch (error) {
      console.error("Error generating AI slug:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleRandomize = () => {
    setIsRandomLoading(true);
    onGenerateRandomSlug();
    setTimeout(() => {
      const newSlug = getValues("slug");
      setValue("slug", newSlug, { shouldDirty: true });
      setCurrentCode(`${domain}/${newSlug}`);
      setIsRandomLoading(false);
    }, RANDOM_SLUG_DELAY_MS);
  };

  const handleSelect = (tagId: string) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];

    setSelectedTags(newSelectedTags);

    const selectedTagNames =
      tags
        ?.filter((tag) => newSelectedTags.includes(tag.id))
        .map((tag) => tag.name) || [];
    setValue("tags", selectedTagNames, { shouldDirty: true });
  };

  const handleAddNewTag = async () => {
    if (!workspaceslug || !searchValue.trim()) return;
    try {
      setIsAddTagLoading(true);
      const response = await axios.post(
        `/api/workspace/${workspaceslug}/tags`,
        { name: searchValue.trim(), color: null },
      );
      if (response.status === 201) {
        const newTag = response.data;
        handleSelect(newTag.id);
        setSearchValue("");
        await mutate(`/api/workspace/${workspaceslug}/tags`);
      }
    } catch (error) {
      console.error("Error creating tag:", error);
    } finally {
      setIsAddTagLoading(false);
    }
  };

  const handleUrlBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const normalizedUrl = normalizeUrl(e.target.value);
    setValue("url", normalizedUrl, { shouldDirty: true });
  };

  const handleDomainChange = (selectedDomain: string) => {
    setValue("domain", selectedDomain, { shouldDirty: true });

    // Find the domain object and set customDomainId
    const domainObj = availableDomains.find((d) => d.value === selectedDomain);
    setValue("customDomainId", domainObj?.id || null, {
      shouldDirty: true,
    });
  };

  // Effects
  useEffect(() => {
    setCurrentCode(slug ? `${domain}/${slug}` : "");
  }, [domain, slug]);

  // Instant URL validation
  useEffect(() => {
    const validation = validateUrlFormat(instantUrl);
    setUrlValidation(validation);
  }, [instantUrl]);

  // URL safety checking
  useEffect(() => {
    if (!instantUrl) {
      setUrlSafetyStatus({ isChecking: false, isValid: null, message: "" });
      return;
    }
    debouncedCheckUrlSafety(instantUrl);
  }, [instantUrl]);

  useEffect(() => {
    if (currentTags.length && tags) {
      const tagIds = tags
        .filter((tag) => currentTags.includes(tag.name))
        .map((tag) => tag.id);
      setSelectedTags(tagIds);
    }
  }, [currentTags, tags]);

  useEffect(() => {
    if (tags && currentTags.length > 0 && selectedTags.length === 0) {
      const tagIds = tags
        .filter((tag) => currentTags.includes(tag.name))
        .map((tag) => tag.id);
      setSelectedTags(tagIds);
    }
  }, [tags, currentTags, selectedTags.length]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (urlValidationTimeoutRef.current) {
        clearTimeout(urlValidationTimeoutRef.current);
      }
      if (safetyCheckTimeoutRef.current) {
        clearTimeout(safetyCheckTimeoutRef.current);
      }
    };
  }, []);

  // Type guard
  const isLinkData = (obj: unknown): obj is LinkData => {
    return !!obj && typeof obj === "object" && "qrCode" in obj;
  };

  // Form values
  const normalizedUrl = normalizeUrl(url);
  const qrCodeCustomization = (() => {
    if (isLinkData(form.formState.defaultValues)) {
      return form.formState.defaultValues.qrCode?.customization;
    }
    return undefined;
  })();

  // Extract custom metadata
  const customMetadata = (() => {
    if (isLinkData(form.formState.defaultValues)) {
      return {
        image: form.formState.defaultValues.image || null,
        title: form.formState.defaultValues.title || null,
        metadesc: form.formState.defaultValues.metadesc || null,
      };
    }
    return { image: null, title: null, metadesc: null };
  })();

  // Choose which metadata to show in preview: draft first (create), otherwise server/defaults
  const previewImage = draftMetadata?.imagePreview
    ? draftMetadata.imagePreview || undefined
    : undefined;
  const effectiveImage = (draftMetadata?.image ?? null) !== null
    ? (draftMetadata?.image || undefined)
    : (customMetadata.image || undefined);
  const effectiveTitle = (draftMetadata?.title ?? null) !== null
    ? (draftMetadata?.title || undefined)
    : (customMetadata.title || undefined);
  const effectiveMetadesc = (draftMetadata?.metadesc ?? null) !== null
    ? (draftMetadata?.metadesc || undefined)
    : (customMetadata.metadesc || undefined);

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      {/* Left side: Form fields */}
      <div className="space-y-4 sm:space-y-6">
        {/* URL field with safety indicator */}
        <FormField
          control={control}
          name="url"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Destination URL</FormLabel>
                <SafetyIndicator status={urlSafetyStatus} />
              </div>
              <FormControl>
                <Input
                  {...field}
                  placeholder="https://slugy.co/blogs/project-x"
                  autoComplete="off"
                  className={
                    !urlValidation.isValid
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : urlSafetyStatus.isValid === false
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : ""
                  }
                  onBlur={handleUrlBlur}
                  onChange={(e) => {
                    field.onChange(e);
                    debouncedValidateUrl(e.target.value);
                  }}
                />
              </FormControl>
              {/* <FormMessage /> */}
              {!urlValidation.isValid && urlValidation.message && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <span>{urlValidation.message}</span>
                </div>
              )}
            </FormItem>
          )}
        />

        {/* Short link domain and slug inputs with buttons */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex w-full items-center justify-between gap-2 space-y-1">
              <Label>Short Link</Label>
              {isSlugEditable && (
                <div className="flex gap-x-3">
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={() => handleAiRandomize(getValues("url"))}
                          variant="ghost"
                          size="icon"
                          className="size-4 p-0"
                          disabled={isAiLoading}
                        >
                          {isAiLoading ? (
                            <Loader2 className="text-muted-foreground size-4 animate-spin" />
                          ) : (
                            <BsStars className="text-muted-foreground size-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Generate AI slug</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={handleRandomize}
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground size-4 p-0"
                          disabled={isRandomLoading}
                        >
                          {isRandomLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Shuffle className="size-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Suffle slug</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
            {isEditMode && !isSlugEditable && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-muted ml-3 size-4 p-0"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        enableSlugEditing();
                      }}
                    >
                      <Lock className="text-muted-foreground size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={5}>
                    Editing an existing short link could potentially break
                    existing links
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex flex-row">
            <FormField
              control={control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={handleDomainChange}
                    defaultValue={field.value}
                    disabled={domainsLoading}
                  >
                    <SelectTrigger className="w-full rounded-r-none border-r-0 shadow-none sm:w-[180px]">
                      <SelectValue placeholder="Domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDomains.map((domain) => (
                        <SelectItem key={domain.value} value={domain.value}>
                          {domain.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="slug"
              render={({ field }) => (
                <FormItem className="relative flex-1">
                  <FormControl>
                    <Input
                      {...field}
                      ref={slugInputRef}
                      autoComplete="off"
                      placeholder="(optional)"
                      disabled={!isSlugEditable}
                      className={cn(
                        "rounded-l-none shadow-none",
                        !isSlugEditable && "cursor-not-allowed bg-zinc-100",
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Tag selection */}
        <div className="space-y-3">
          <Label>Tags</Label>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={popoverOpen}
                className="h-auto min-h-[40px] w-full justify-between bg-transparent px-3 hover:bg-transparent"
                disabled={tagsLoading}
              >
                <div className="flex flex-wrap gap-1.5">
                  {tagsLoading ? (
                    <span className="text-gray-500">Loading tags...</span>
                  ) : selectedTagObjects.length > 0 ? (
                    selectedTagObjects.map((tag) => (
                      <TagBadge key={tag.id} tag={tag} />
                    ))
                  ) : (
                    <span className="text-gray-500">Select tags...</span>
                  )}
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <div className="p-2">
                <Input
                  placeholder="Search or add tags..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="mb-2"
                />
                <div className="max-h-60 overflow-y-auto">
                  {tagsError ? (
                    <div className="px-2 py-1.5 text-sm text-red-500">
                      Error loading tags. Please try again.
                    </div>
                  ) : tagsLoading ? (
                    <div className="px-2 py-1.5 text-sm text-gray-500">
                      Loading tags...
                    </div>
                  ) : filteredTags.length > 0 ? (
                    <div className="space-y-1">
                      {filteredTags.map((tag) => (
                        <div
                          key={tag.id}
                          onClick={() => handleSelect(tag.id)}
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
                        >
                          <div className="flex flex-1 items-center gap-2">
                            <Tag
                              className={cn(
                                "h-4 w-4",
                                COLOR_OPTIONS.find(
                                  (color) => color.value === tag.color,
                                )?.textColor || COLOR_OPTIONS[0]!.textColor,
                              )}
                            />
                            <span>{tag.name}</span>
                          </div>
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedTags.includes(tag.id)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-gray-500">
                      {canAddNew ? (
                        <button
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 hover:bg-gray-100"
                          onClick={handleAddNewTag}
                          disabled={isAddTagLoading}
                        >
                          {isAddTagLoading ? (
                            <LoaderIcon className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          Add &quot;{searchValue}&quot;
                        </button>
                      ) : (
                        "No tags found."
                      )}
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Comments textarea */}
        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Comments</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Add comment"
                  className="min-h-24"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* Right side: QR code and link preview */}
      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>QR Code</Label>
            {/* {linkId && isEditMode && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setQrCodeDialogOpen(true)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Customize QR Code</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )} */}
          </div>
          <LinkQrCode
            key={qrCodeKey}
            domain={domain}
            code={currentCode}
            customization={qrCodeCustomization}
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Link Preview</Label>
            {(isEditMode ? (linkId && isEditMode) : true) && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setMetadataDialogOpen(true)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Preview</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <LinkPreview
            url={normalizedUrl}
            key={normalizedUrl}
            customImage={previewImage || effectiveImage}
            customTitle={effectiveTitle}
            customDescription={effectiveMetadesc}
          />
        </div>
      </div>

      {/* Link Metadata Dialog */}
      {(
        (isEditMode && linkId) || !isEditMode
      ) && (
        <LinkCustomMetadata
          linkId={isEditMode ? linkId : undefined}
          linkUrl={normalizedUrl}
          currentImage={
            isEditMode
              ? (draftMetadata?.image ?? (form.formState.defaultValues as LinkData | undefined)?.image ?? null)
              : (draftMetadata?.image || null)
          }
          currentTitle={
            isEditMode
              ? (draftMetadata?.title ?? (form.formState.defaultValues as LinkData | undefined)?.title ?? null)
              : (draftMetadata?.title || null)
          }
          currentDescription={
            isEditMode
              ? (draftMetadata?.metadesc ?? (form.formState.defaultValues as LinkData | undefined)?.metadesc ?? null)
              : (draftMetadata?.metadesc || null)
          }
          workspaceslug={isEditMode ? workspaceslug! : undefined}
          open={metadataDialogOpen}
          onOpenChange={setMetadataDialogOpen}
          persistMode={(!isEditMode || onDraftMetadataSave) ? "local" : "server"}
          onSave={(payload) => {
            if (!isEditMode || onDraftMetadataSave) {
              if (onDraftMetadataSave && payload) {
                onDraftMetadataSave({
                  image: payload.image || null,
                  title: payload.title || null,
                  metadesc: payload.metadesc || null,
                  imagePreview: payload.imagePreview || null,
                  selectedFile: payload.selectedFile || null,
                });
              }
              return;
            }
            // Edit flow: Force re-render and refetch
            setQrCodeKey((prev) => prev + 1);
            void mutate(
              (key) =>
                typeof key === "string" &&
                key.includes(`/workspace/${workspaceslug}/link/`),
              undefined,
              { revalidate: true },
            );
          }}
        />
      )}

      {/* QR Code Design Dialog */}
      {linkId && isEditMode && (
        <Dialog open={qrCodeDialogOpen} onOpenChange={setQrCodeDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-medium">
                QR Code Design
              </DialogTitle>
            </DialogHeader>
            <QRCodeDesign
              linkId={linkId}
              domain={domain}
              code={slug || currentCode}
              onOpenChange={(open: boolean) => {
                setQrCodeDialogOpen(open);
                if (!open) {
                  // Refresh QR code after closing
                  setQrCodeKey((prev) => prev + 1);
                  void mutate(
                    (key) =>
                      typeof key === "string" &&
                      key.includes(`/workspace/${workspaceslug}/link/`),
                    undefined,
                    { revalidate: true },
                  );
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default LinkFormFields;
