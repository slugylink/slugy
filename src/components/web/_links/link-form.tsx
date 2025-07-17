"use client";

import React, { useState, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
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
} from "@/components/ui/form";
import { Loader2, Shuffle, TriangleAlert } from "lucide-react";
import { BsStars } from "react-icons/bs";
import LinkQrCode from "./link-qrcode";
import LinkPreview from "./link-preview";
import type { LinkFormValues } from "@/types/link-form";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Tag, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import useSWR, { mutate } from "swr";
import { COLOR_OPTIONS } from "@/constants/tag-colors";
import type { LinkData } from "@/types/link-form";

interface LinkFormFieldsProps {
  form: UseFormReturn<LinkFormValues>;
  code: string;
  onGenerateRandomSlug: () => void;
  isEditMode?: boolean;
  workspaceslug?: string;
}

interface Tag {
  id: string;
  name: string;
  color: string | null;
  linkCount: number;
}

export default function LinkFormFields({
  form,
  code,
  onGenerateRandomSlug,
  isEditMode = false,
  workspaceslug,
}: LinkFormFieldsProps) {
  const { control, getValues, watch, setValue } = form;
  const [currentCode, setCurrentCode] = useState(code);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRandomLoading, setIsRandomLoading] = useState(false);

  // Watch for changes in the domain and slug fields
  const domain = watch("domain");
  const slug = watch("slug");

  // Fetch tags from the workspace
  const {
    data: tags,
    error: tagsError,
    isLoading: tagsLoading,
  } = useSWR<Tag[]>(
    workspaceslug ? `/api/workspace/${workspaceslug}/tags` : null,
  );

  useEffect(() => {
    // Update the currentCode when domain or slug changes
    setCurrentCode(slug ? `${domain}/${slug}` : "");
  }, [domain, slug]);

  const handleAiRandomize = async (url: string) => {
    try {
      if (!url) return;

      setIsAiLoading(true);

      const res = await axios.post("/api/ai/link-slug", {
        url,
      });

      const data = res.data as { slug: string };
      setValue("slug", data.slug, { shouldDirty: true });

      // The currentCode will be updated automatically via the useEffect
      // that watches for changes in domain and slug
    } catch (error) {
      console.error("Error generating AI slug:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleRandomize = () => {
    setIsRandomLoading(true);

    onGenerateRandomSlug();

    // The new slug will be reflected in the form values after the state update
    setTimeout(() => {
      const newSlug = getValues("slug");
      setValue("slug", newSlug, { shouldDirty: true });
      setCurrentCode(`${domain}/${newSlug}`);
      setIsRandomLoading(false);
    }, 300); // Adding a small delay to make the loading state visible
  };

  const [open, setOpen] = React.useState(false);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [searchValue, setSearchValue] = React.useState("");

  // Get current tags from form
  const currentTags = getValues("tags") || [];

  // Initialize selected tags from form values
  useEffect(() => {
    if (currentTags.length > 0 && tags) {
      const tagIds = tags
        .filter((tag) => currentTags.includes(tag.name))
        .map((tag) => tag.id);
      setSelectedTags(tagIds);
    }
  }, [currentTags, tags]);

  // Also initialize when tags are loaded and we have current tags
  useEffect(() => {
    if (tags && currentTags.length > 0 && selectedTags.length === 0) {
      const tagIds = tags
        .filter((tag) => currentTags.includes(tag.name))
        .map((tag) => tag.id);
      setSelectedTags(tagIds);
    }
  }, [tags, currentTags, selectedTags.length]);

  const handleSelect = (tagId: string) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];

    setSelectedTags(newSelectedTags);

    // Update form with tag names
    const selectedTagNames =
      tags
        ?.filter((tag) => newSelectedTags.includes(tag.id))
        .map((tag) => tag.name) || [];

    setValue("tags", selectedTagNames, { shouldDirty: true });
  };

  const selectedTagObjects =
    tags?.filter((tag) => selectedTags.includes(tag.id)) || [];

  // Helper function to get color option for a tag
  const getColorOption = (tagColor: string | null) => {
    return (
      COLOR_OPTIONS.find((color) => color.value === tagColor) ??
      COLOR_OPTIONS[0]!
    );
  };

  const filteredTags =
    tags?.filter((tag) =>
      tag.name.toLowerCase().includes(searchValue.toLowerCase()),
    ) || [];

  const canAddNew =
    searchValue &&
    tags &&
    !tags.some((tag) => tag.name.toLowerCase() === searchValue.toLowerCase());

  const handleAddNewTag = async () => {
    if (!workspaceslug || !searchValue.trim()) return;

    try {
      const response = await axios.post(
        `/api/workspace/${workspaceslug}/tags`,
        {
          name: searchValue.trim(),
          color: null, // You can add color selection later
        },
      );

      if (response.status === 201) {
        const newTag = response.data;
        // Add the new tag to the selection
        handleSelect(newTag.id);
        setSearchValue("");
        // Refresh the tags list
        await mutate(`/api/workspace/${workspaceslug}/tags`);
      }
    } catch (error) {
      console.error("Error creating tag:", error);
      // You can add toast notification here
    }
  };

  // Type guard to check if defaultValues is LinkData
  function isLinkData(obj: unknown): obj is LinkData {
    return !!obj && typeof obj === "object" && "qrCode" in obj;
  }

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <div className="space-y-4 sm:space-y-6">
        <FormField
          control={control}
          name="url"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Destination URL</FormLabel>
              </div>
              <FormControl>
                <Input
                  {...field}
                  placeholder="https://slugy.co/blogs/project-x"
                  autoComplete="off"
                />
              </FormControl>
            </FormItem>
          )}
        />

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
                        // Prevent event propagation
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
                      <SelectItem value="slugy.co">slugy.co</SelectItem>
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
                  <div className="relative flex w-full items-center">
                    <FormControl>
                      <Input
                        autoComplete="off"
                        {...field}
                        placeholder="(optional)"
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Tag selection */}
        <div className="space-y-3">
          <Label>Tags</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="h-auto min-h-[40px] w-full justify-between bg-transparent px-3 py-1 hover:bg-transparent"
                disabled={tagsLoading}
              >
                <div className="flex flex-wrap gap-1.5">
                  {tagsLoading ? (
                    <span className="text-gray-500">Loading tags...</span>
                  ) : selectedTagObjects.length > 0 ? (
                    selectedTagObjects.map((tag) => {
                      const colorOption = getColorOption(tag.color);
                      return (
                        <Badge
                          key={tag.id}
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
                    })
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
                                getColorOption(tag.color).textColor,
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

        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Comments</FormLabel>
              </div>
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

      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <div className="mb-3 flex items-center justify-between">
            <Label>QR Code</Label>
          </div>

          <LinkQrCode
            code={currentCode}
            customization={
              isLinkData(form.formState.defaultValues)
                ? form.formState.defaultValues.qrCode?.customization
                : undefined
            }
          />
        </div>

        <div className="space-y-2">
          <div className="mb-3 flex items-center justify-between">
            <Label>Link Preview</Label>
          </div>

          <LinkPreview url={getValues("url")} />
        </div>
      </div>
    </div>
  );
}
