"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import axios from "axios";
import useSWR, { mutate } from "swr";
import { cn } from "@/lib/utils";
import { validateUrlSafety } from "@/server/actions/url-scan";
import { useDebounce } from "@/hooks/use-debounce";
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
  TriangleAlert,
  Shield,
  ShieldAlert,
  Tag,
  Check,
  Plus,
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
import type { LinkFormValues, LinkData } from "@/types/link-form";
import { COLOR_OPTIONS } from "@/constants/tag-colors";

// Types
interface LinkFormFieldsProps {
  form: UseFormReturn<LinkFormValues>;
  code: string;
  onGenerateRandomSlug: () => void;
  isEditMode?: boolean;
  workspaceslug?: string;
  onSafetyStatusChange?: (status: {
    isChecking: boolean;
    isValid: boolean | null;
    message: string;
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
const URL_SAFETY_DEBOUNCE_MS = 700;
const AI_SLUG_ENDPOINT = "/api/ai/link-slug";
const RANDOM_SLUG_DELAY_MS = 300;
const DEFAULT_DOMAIN = "slugy.co";

// Memoized components
const SafetyIndicator = React.memo(({ status }: { status: UrlSafetyStatus }) => {
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
});

SafetyIndicator.displayName = "SafetyIndicator";

const TagBadge = React.memo(({ tag }: { tag: TagType }) => {
  const colorOption = useMemo(() => 
    COLOR_OPTIONS.find((color) => color.value === tag.color) || COLOR_OPTIONS[0]!,
    [tag.color]
  );
  
  return (
    <Badge
      variant="secondary"
      className={cn(
        "flex items-center gap-1 rounded-sm px-1 py-[1px] text-sm font-normal",
        colorOption.bgColor,
        colorOption.borderColor,
      )}
    >
      {tag.name}
    </Badge>
  );
});

TagBadge.displayName = "TagBadge";

const LinkFormFields = React.memo(({
  form,
  code,
  onGenerateRandomSlug,
  isEditMode = false,
  workspaceslug,
  onSafetyStatusChange,
}: LinkFormFieldsProps) => {
  const { control, getValues, watch, setValue } = form;

  // State management
  const [currentCode, setCurrentCode] = useState(code);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRandomLoading, setIsRandomLoading] = useState(false);
  const [urlSafetyStatus, setUrlSafetyStatus] = useState<UrlSafetyStatus>({
    isChecking: false,
    isValid: null,
    message: "",
  });
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");

  // Form values
  const domain = watch("domain");
  const slug = watch("slug");
  const url = watch("url");

  // Debounced URL for safety checking
  const debouncedUrl = useDebounce(url, URL_SAFETY_DEBOUNCE_MS);

  // Fetch tags for workspace
  const {
    data: tags,
    error: tagsError,
    isLoading: tagsLoading,
  } = useSWR<TagType[]>(
    workspaceslug ? `/api/workspace/${workspaceslug}/tags` : null,
  );

  // Memoized computed values
  const currentTags = useMemo(() => getValues("tags") || [], [getValues]);
  
  const selectedTagObjects = useMemo(() => 
    tags?.filter((tag) => selectedTags.includes(tag.id)) || [],
    [tags, selectedTags]
  );

  const filteredTags = useMemo(() => 
    tags?.filter((tag) =>
      tag.name.toLowerCase().includes(searchValue.toLowerCase()),
    ) || [],
    [tags, searchValue]
  );

  const canAddNew = useMemo(() => 
    searchValue &&
    tags &&
    !tags.some((tag) => tag.name.toLowerCase() === searchValue.toLowerCase()),
    [searchValue, tags]
  );

  // Memoized handlers
  const normalizeUrl = useCallback((rawUrl: string): string => {
    if (!rawUrl) return rawUrl;
    if (/^https?:\/\//.test(rawUrl)) return rawUrl;
    if (
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(rawUrl) ||
      rawUrl.startsWith("www.")
    ) {
      return `https://${rawUrl}`;
    }
    return rawUrl;
  }, []);

  const checkUrlSafety = useCallback(async (checkUrl: string) => {
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
  }, [normalizeUrl, onSafetyStatusChange]);

  const handleAiRandomize = useCallback(async (rawUrl: string) => {
    if (!rawUrl) return;
    setIsAiLoading(true);
    try {
      const normalizedUrl = normalizeUrl(rawUrl);
      const res = await axios.post(AI_SLUG_ENDPOINT, { url: normalizedUrl });
      const data = res.data as { slug: string };
      setValue("slug", data.slug, { shouldDirty: true });
    } catch (error) {
      console.error("Error generating AI slug:", error);
    } finally {
      setIsAiLoading(false);
    }
  }, [normalizeUrl, setValue]);

  const handleRandomize = useCallback(() => {
    setIsRandomLoading(true);
    onGenerateRandomSlug();
    setTimeout(() => {
      const newSlug = getValues("slug");
      setValue("slug", newSlug, { shouldDirty: true });
      setCurrentCode(`${domain}/${newSlug}`);
      setIsRandomLoading(false);
    }, RANDOM_SLUG_DELAY_MS);
  }, [onGenerateRandomSlug, getValues, setValue, domain]);

  const handleSelect = useCallback((tagId: string) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];

    setSelectedTags(newSelectedTags);

    const selectedTagNames =
      tags
        ?.filter((tag) => newSelectedTags.includes(tag.id))
        .map((tag) => tag.name) || [];
    setValue("tags", selectedTagNames, { shouldDirty: true });
  }, [selectedTags, tags, setValue]);

  const handleAddNewTag = useCallback(async () => {
    if (!workspaceslug || !searchValue.trim()) return;
    try {
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
    }
  }, [workspaceslug, searchValue, handleSelect]);

  const handleUrlBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const normalizedUrl = normalizeUrl(e.target.value);
    setValue("url", normalizedUrl, { shouldDirty: true });
  }, [normalizeUrl, setValue]);

  // Effects
  useEffect(() => {
    setCurrentCode(slug ? `${domain}/${slug}` : "");
  }, [domain, slug]);

  useEffect(() => {
    if (!debouncedUrl) {
      setUrlSafetyStatus({ isChecking: false, isValid: null, message: "" });
      return;
    }
    checkUrlSafety(debouncedUrl);
  }, [debouncedUrl, checkUrlSafety]);

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

  // Type guard
  const isLinkData = useCallback((obj: unknown): obj is LinkData => {
    return !!obj && typeof obj === "object" && "qrCode" in obj;
  }, []);

  // Memoized form values
  const normalizedUrl = useMemo(() => normalizeUrl(url), [normalizeUrl, url]);
  const qrCodeCustomization = useMemo(() => {
    if (isLinkData(form.formState.defaultValues)) {
      return form.formState.defaultValues.qrCode?.customization;
    }
    return undefined;
  }, [form.formState.defaultValues, isLinkData]);

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
                    urlSafetyStatus.isValid === false
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : ""
                  }
                  onBlur={handleUrlBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Short link domain and slug inputs with buttons */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex w-full items-center justify-between gap-2 space-y-1">
              <Label>Short Link</Label>
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
                          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                        ) : (
                          <BsStars className="text-muted-foreground h-4 w-4" />
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
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Shuffle className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Generate random slug</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            {isEditMode && (
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
                      }}
                    >
                      <TriangleAlert className="h-4 w-4 text-red-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={5}>
                    Editing a short link may break existing references.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <FormField
              control={control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="w-full shadow-none sm:w-[120px]">
                      <SelectValue placeholder="Domain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT_DOMAIN}>{DEFAULT_DOMAIN}</SelectItem>
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
                      autoComplete="off"
                      placeholder="(optional)"
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
                className="h-auto min-h-[40px] w-full justify-between bg-transparent px-3 py-1 hover:bg-transparent"
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
                                COLOR_OPTIONS.find((color) => color.value === tag.color)?.textColor || COLOR_OPTIONS[0]!.textColor,
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
                        <div
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 hover:bg-gray-100"
                          onClick={handleAddNewTag}
                        >
                          <Plus className="h-4 w-4" />
                          Add &quot;{searchValue}&quot;
                        </div>
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
        <div className="space-y-2">
          <Label>QR Code</Label>
          <LinkQrCode
            code={currentCode}
            customization={qrCodeCustomization}
          />
        </div>
        <div className="space-y-2">
          <Label>Link Preview</Label>
          <LinkPreview url={normalizedUrl} />
        </div>
      </div>
    </div>
  );
});

LinkFormFields.displayName = "LinkFormFields";

export default LinkFormFields;
