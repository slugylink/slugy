"use client";

import Image from "next/image";
import { useRef, useCallback, useReducer, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { Upload, Link2 } from "lucide-react";
import { Loader2 } from "@/utils/icons/loader2";

type MetadataApiResponse = {
  success: boolean;
  data?: {
    title?: string;
    description?: string;
    image?: string | null;
  };
};

interface LinkCustomMetadataProps {
  linkId?: string;
  workspaceslug?: string;
  linkUrl: string;
  currentImage: string | null;
  currentTitle: string | null;
  currentDescription: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload?: {
    image: string;
    title: string;
    metadesc: string;
    selectedFile?: File | null;
    imagePreview?: string;
  }) => void;
  persistMode?: "server" | "local";
}

type MetadataState = {
  image: string;
  title: string;
  metadesc: string;
  isSaving: boolean;
  isUploading: boolean;
  selectedFile: File | null;
  imagePreview: string;
};

type MetadataAction =
  | {
      type: "init";
      payload: Pick<MetadataState, "image" | "title" | "metadesc">;
    }
  | { type: "set_title"; payload: string }
  | { type: "set_description"; payload: string }
  | { type: "set_image_url"; payload: string }
  | { type: "set_file_preview"; payload: { file: File; preview: string } }
  | { type: "clear_image" }
  | { type: "start_save" }
  | { type: "end_save" }
  | { type: "start_upload" }
  | { type: "end_upload" };

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 240;

function resolveMetadataDefaults({
  currentImage,
  currentTitle,
  currentDescription,
  defaults,
}: {
  currentImage: string | null;
  currentTitle: string | null;
  currentDescription: string | null;
  defaults?: { image?: string | null; title?: string; description?: string };
}): Pick<MetadataState, "image" | "title" | "metadesc"> {
  return {
    image: currentImage || defaults?.image || "",
    title: currentTitle || defaults?.title || "",
    metadesc: currentDescription || defaults?.description || "",
  };
}

function metadataReducer(
  state: MetadataState,
  action: MetadataAction,
): MetadataState {
  switch (action.type) {
    case "init":
      return {
        ...state,
        image: action.payload.image,
        title: action.payload.title,
        metadesc: action.payload.metadesc,
        selectedFile: null,
        imagePreview: "",
      };
    case "set_title":
      return { ...state, title: action.payload };
    case "set_description":
      return { ...state, metadesc: action.payload };
    case "set_image_url":
      return {
        ...state,
        image: action.payload,
        selectedFile: null,
        imagePreview: "",
      };
    case "set_file_preview":
      return {
        ...state,
        selectedFile: action.payload.file,
        image: "",
        imagePreview: action.payload.preview,
      };
    case "clear_image":
      return { ...state, image: "", imagePreview: "", selectedFile: null };
    case "start_save":
      return { ...state, isSaving: true };
    case "end_save":
      return { ...state, isSaving: false };
    case "start_upload":
      return { ...state, isUploading: true };
    case "end_upload":
      return { ...state, isUploading: false };
    default:
      return state;
  }
}

function ImageSection({
  image,
  imagePreview,
  isUploading,
  fileInputRef,
  onClear,
  onSetImageUrl,
  onDrop,
  onDragOver,
  onFileChange,
  onContainerClick,
}: {
  image: string;
  imagePreview: string;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onClear: () => void;
  onSetImageUrl: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onContainerClick: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Image</Label>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="cursor-pointer text-xs"
            type="button"
          >
            Remove
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onSetImageUrl}
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        onDrop={isUploading ? undefined : onDrop}
        onDragOver={isUploading ? undefined : onDragOver}
        className="relative cursor-pointer overflow-hidden rounded-lg border-2 border-dashed"
        style={{ pointerEvents: isUploading ? "none" : "auto" }}
        onClick={onContainerClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />

        {image || imagePreview ? (
          <div className="group relative">
            <Image
              src={imagePreview || image}
              alt="Preview"
              width={1200}
              height={630}
              className="aspect-[1200/630] w-full object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex aspect-[1200/630] flex-col items-center justify-center bg-gray-50 text-center">
            {isUploading ? (
              <Loader2 className="mb-2 h-5 w-5 animate-spin" />
            ) : (
              <Upload className="text-muted-foreground mb-2 h-7 w-7" />
            )}
            <p className="text-muted-foreground text-xs">
              {isUploading ? "Uploading..." : "Click to upload"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Recommended: 1200 x 630 pixels (max 512kb)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TextFieldSection({
  label,
  value,
  max,
  placeholder,
  onChange,
  isTextarea = false,
}: {
  label: string;
  value: string;
  max: number;
  placeholder: string;
  onChange: (value: string) => void;
  isTextarea?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-muted-foreground text-xs">
          {value.length}/{max}
        </span>
      </div>
      {isTextarea ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={max}
          className="resize-none overflow-y-auto"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={max}
        />
      )}
    </div>
  );
}

export default function LinkCustomMetadata({
  linkId,
  linkUrl,
  currentImage,
  currentTitle,
  currentDescription,
  workspaceslug,
  open,
  onOpenChange,
  onSave,
  persistMode = "server",
}: LinkCustomMetadataProps) {
  const { data: defaultMetadata } = useSWR<MetadataApiResponse>(
    linkUrl ? `/api/metadata?url=${encodeURIComponent(linkUrl)}` : null,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  const resolvedDefaults = defaultMetadata?.data ?? {};
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resolvedCurrentValues = resolveMetadataDefaults({
    currentImage,
    currentTitle,
    currentDescription,
    defaults: resolvedDefaults,
  });

  const [state, dispatch] = useReducer(
    metadataReducer,
    resolvedCurrentValues,
    (initialFields) => ({
      ...initialFields,
      isSaving: false,
      isUploading: false,
      selectedFile: null,
      imagePreview: "",
    }),
  );

  useEffect(() => {
    const hasCustomMetadata = Boolean(
      currentImage || currentTitle || currentDescription,
    );
    const hasUserEdits =
      state.selectedFile !== null ||
      state.imagePreview !== "" ||
      state.image !== resolvedCurrentValues.image ||
      state.title !== resolvedCurrentValues.title ||
      state.metadesc !== resolvedCurrentValues.metadesc;

    const needsHydration =
      state.image !== resolvedCurrentValues.image ||
      state.title !== resolvedCurrentValues.title ||
      state.metadesc !== resolvedCurrentValues.metadesc;

    if (open && !hasCustomMetadata && !hasUserEdits && needsHydration) {
      dispatch({ type: "init", payload: resolvedCurrentValues });
    }
  }, [
    open,
    currentImage,
    currentTitle,
    currentDescription,
    resolvedCurrentValues,
    state.selectedFile,
    state.imagePreview,
    state.image,
    state.title,
    state.metadesc,
  ]);

  const syncFromSource = useCallback(
    (useRemoteDefaults: boolean) => {
      dispatch({
        type: "init",
        payload: useRemoteDefaults
          ? {
              image: resolvedDefaults.image || "",
              title: resolvedDefaults.title || "",
              metadesc: resolvedDefaults.description || "",
            }
          : resolveMetadataDefaults({
              currentImage,
              currentTitle,
              currentDescription,
              defaults: resolvedDefaults,
            }),
      });
    },
    [currentImage, currentTitle, currentDescription, resolvedDefaults],
  );

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        syncFromSource(false);
      }
      onOpenChange(nextOpen);
    },
    [syncFromSource, onOpenChange],
  );

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const maxSize = 512 * 1024;
    if (file.size > maxSize) {
      toast.error("Image size must be less than 512KB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      dispatch({
        type: "set_file_preview",
        payload: { file, preview: result },
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const resetToDefaults = useCallback(async () => {
    try {
      const response = await axios.get<MetadataApiResponse>(
        `/api/metadata?url=${encodeURIComponent(linkUrl)}`,
      );
      const metadata = response.data?.data;
      dispatch({
        type: "init",
        payload: {
          image: metadata?.image || "",
          title: metadata?.title || "",
          metadesc: metadata?.description || "",
        },
      });
      toast.success("Reset to default metadata");
    } catch (error) {
      console.error("Failed to fetch default metadata:", error);
      toast.error("Failed to reset metadata");
    }
  }, [linkUrl]);

  const handleSetImageUrl = useCallback(() => {
    const url = prompt("Enter image URL:");
    if (!url) return;

    try {
      new URL(url);
      dispatch({ type: "set_image_url", payload: url });
    } catch {
      toast.error("Invalid URL");
    }
  }, []);

  const handleSave = useCallback(async () => {
    dispatch({ type: "start_save" });
    try {
      if (persistMode === "local") {
        onSave({
          image: state.image,
          title: state.title,
          metadesc: state.metadesc,
          selectedFile: state.selectedFile,
          imagePreview: state.imagePreview,
        });
        onOpenChange(false);
        return;
      }

      let imageUrl = state.image;

      if (state.selectedFile) {
        dispatch({ type: "start_upload" });
        try {
          const formData = new FormData();
          formData.append("file", state.selectedFile);

          const uploadResponse = await axios.post(
            `/api/workspace/${workspaceslug}/link/${linkId}/upload-image`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } },
          );

          imageUrl = uploadResponse.data.url;
          dispatch({ type: "set_image_url", payload: imageUrl });
        } catch (error) {
          console.error("Failed to upload image:", error);
          toast.error("Failed to upload image");
          return;
        } finally {
          dispatch({ type: "end_upload" });
        }
      }

      const updatePayload: {
        image?: string | null;
        title?: string | null;
        metadesc?: string | null;
      } = {};

      if (state.image !== currentImage) {
        updatePayload.image = imageUrl || null;
      }
      if (state.title !== currentTitle) {
        updatePayload.title = state.title || null;
      }
      if (state.metadesc !== currentDescription) {
        updatePayload.metadesc = state.metadesc || null;
      }

      if (Object.keys(updatePayload).length > 0) {
        await axios.patch(
          `/api/workspace/${workspaceslug}/link/${linkId}/update`,
          updatePayload,
        );
      }

      toast.success("Link preview metadata updated successfully");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update metadata:", error);
      toast.error("Failed to update link preview metadata");
    } finally {
      dispatch({ type: "end_save" });
    }
  }, [
    currentDescription,
    currentImage,
    currentTitle,
    linkId,
    onOpenChange,
    onSave,
    persistMode,
    state.image,
    state.imagePreview,
    state.metadesc,
    state.selectedFile,
    state.title,
    workspaceslug,
  ]);

  const handleCancel = useCallback(() => {
    syncFromSource(false);
    onOpenChange(false);
  }, [syncFromSource, onOpenChange]);

  const isDirty =
    state.selectedFile !== null ||
    state.imagePreview !== "" ||
    state.image !== resolvedCurrentValues.image ||
    state.title !== resolvedCurrentValues.title ||
    state.metadesc !== resolvedCurrentValues.metadesc;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="p-4 sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Link Preview</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <ImageSection
            image={state.image}
            imagePreview={state.imagePreview}
            isUploading={state.isUploading}
            fileInputRef={fileInputRef}
            onClear={() => dispatch({ type: "clear_image" })}
            onSetImageUrl={handleSetImageUrl}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onFileChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileSelect(file);
              }
            }}
            onContainerClick={() => fileInputRef.current?.click()}
          />

          <TextFieldSection
            label="Title"
            value={state.title}
            max={TITLE_MAX}
            placeholder="Add a title..."
            onChange={(value) =>
              dispatch({ type: "set_title", payload: value })
            }
          />

          <TextFieldSection
            label="Description"
            value={state.metadesc}
            max={DESCRIPTION_MAX}
            placeholder="Add a description..."
            onChange={(value) =>
              dispatch({ type: "set_description", payload: value })
            }
            isTextarea
          />
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <button
            onClick={resetToDefaults}
            className="cursor-pointer text-xs text-gray-800 hover:text-black"
            type="button"
          >
            Reset to default
          </button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={state.isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={state.isSaving || !isDirty}>
              {state.isSaving && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
