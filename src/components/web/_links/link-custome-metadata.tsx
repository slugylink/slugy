"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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

interface LinkCustomMetadataProps {
  // Server mode props
  linkId?: string;
  workspaceslug?: string;

  // Common props
  linkUrl: string;
  currentImage: string | null;
  currentTitle: string | null;
  currentDescription: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // onSave semantics:
  // - server mode: called after successful server save, no args
  // - local mode: called with draft payload to be stored in parent state
  onSave: (payload?: {
    image: string;
    title: string;
    metadesc: string;
    // Optional when image is chosen as a file during create flow
    selectedFile?: File | null;
    imagePreview?: string;
  }) => void;
  // Controls whether Save persists to server or just returns values to parent
  persistMode?: "server" | "local";
}

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 240;

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
  // Fetch default metadata immediately (uses SWR cache if available)
  const { data: defaultMetadata } = useSWR(
    linkUrl ? `/api/metadata?url=${encodeURIComponent(linkUrl)}` : null,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  const [image, setImage] = useState(
    currentImage || defaultMetadata?.image || "",
  );
  const [title, setTitle] = useState(
    currentTitle || defaultMetadata?.title || "",
  );
  const [metadesc, setMetadesc] = useState(
    currentDescription || defaultMetadata?.description || "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Reset state to current values, fallback to defaults
      setImage(currentImage || defaultMetadata?.image || "");
      setTitle(currentTitle || defaultMetadata?.title || "");
      setMetadesc(currentDescription || defaultMetadata?.description || "");
      setSelectedFile(null);
      setImagePreview("");
    }
  }, [open, currentImage, currentTitle, currentDescription, defaultMetadata]);

  const resetToDefaults = useCallback(async () => {
    try {
      const response = await axios.get(
        `/api/metadata?url=${encodeURIComponent(linkUrl)}`,
      );
      const metadata = response.data;

      setImage(metadata.image || "");
      setTitle(metadata.title || "");
      setMetadesc(metadata.description || "");
      setSelectedFile(null);
      setImagePreview("");
      toast.success("Reset to default metadata");
    } catch (error) {
      console.error("Failed to fetch default metadata:", error);
      toast.error("Failed to reset metadata");
    }
  }, [linkUrl]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Check file size (max 512KB)
    const maxSize = 512 * 1024; // 512KB in bytes
    if (file.size > maxSize) {
      toast.error("Image size must be less than 512KB");
      return;
    }

    // Store the file to upload later
    setSelectedFile(file);
    // Clear existing image URL
    setImage("");

    // Create a preview using FileReader
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
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

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Local mode: return values to parent without network calls
      if (persistMode === "local") {
        onSave({
          image: image,
          title,
          metadesc,
          selectedFile,
          imagePreview,
        });
        setIsSaving(false);
        onOpenChange(false);
        return;
      }

      let imageUrl = image;

      // If there's a selected file, upload it to R2 first
      if (selectedFile) {
        setIsUploading(true);
        try {
          // Create FormData for file upload
          const formData = new FormData();
          formData.append("file", selectedFile);

          // Upload to R2 via the workspace-specific endpoint
          const uploadResponse = await axios.post(
            `/api/workspace/${workspaceslug}/link/${linkId}/upload-image`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );

          imageUrl = uploadResponse.data.url;
          // Update the image state with the uploaded URL
          setImage(imageUrl);
          setSelectedFile(null);
          setImagePreview("");
        } catch (error) {
          console.error("Failed to upload image:", error);
          toast.error("Failed to upload image");
          setIsSaving(false);
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      // Build update payload only with changed fields
      const updatePayload: {
        image?: string | null;
        title?: string | null;
        metadesc?: string | null;
      } = {};

      if (image !== currentImage) {
        updatePayload.image = imageUrl || null;
      }
      if (title !== currentTitle) {
        updatePayload.title = title || null;
      }
      if (metadesc !== currentDescription) {
        updatePayload.metadesc = metadesc || null;
      }

      // Only update if there are changes
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
      setIsSaving(false);
    }
  }, [
    image,
    selectedFile,
    title,
    metadesc,
    workspaceslug,
    linkId,
    onSave,
    onOpenChange,
    persistMode,
    imagePreview,
  ]);

  const handleCancel = useCallback(() => {
    setImage(currentImage || "");
    setTitle(currentTitle || "");
    setMetadesc(currentDescription || "");
    setSelectedFile(null);
    setImagePreview("");
    onOpenChange(false);
  }, [currentImage, currentTitle, currentDescription, onOpenChange]);

  const isDirty =
    selectedFile !== null ||
    imagePreview !== "" ||
    image !== currentImage ||
    title !== currentTitle ||
    metadesc !== currentDescription;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Link Preview</DialogTitle>
            {/* <Badge variant="secondary">PRO</Badge> */}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Image Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Image</Label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setImage("");
                    setImagePreview("");
                    setSelectedFile(null);
                  }}
                  className="cursor-pointer text-xs"
                >
                  Remove{" "}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const url = prompt("Enter image URL:");
                    if (url) {
                      try {
                        new URL(url);
                        setImage(url);
                        // Clear selected file when setting URL directly
                        setSelectedFile(null);
                        setImagePreview("");
                      } catch {
                        toast.error("Invalid URL");
                      }
                    }
                  }}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div
              onDrop={isUploading ? undefined : handleDrop}
              onDragOver={isUploading ? undefined : handleDragOver}
              className="relative cursor-pointer overflow-hidden rounded-lg border-2 border-dashed"
              style={{ pointerEvents: isUploading ? "none" : "auto" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileSelect(file);
                  }
                }}
              />

              {image || imagePreview ? (
                <div className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview || image}
                    alt="Preview"
                    className="aspect-[1200/630] w-full object-cover"
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

          {/* Title Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Title</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  {title.length}/{TITLE_MAX}
                </span>
                {/* <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Settings className="h-4 w-4" />
                </Button> */}
              </div>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a title..."
              maxLength={TITLE_MAX}
            />
          </div>

          {/* Description Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Description</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  {metadesc.length}/{DESCRIPTION_MAX}
                </span>
                {/* <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Settings className="h-4 w-4" />
                </Button> */}
              </div>
            </div>
            <Textarea
              value={metadesc}
              onChange={(e) => setMetadesc(e.target.value)}
              placeholder="Add a description..."
              maxLength={DESCRIPTION_MAX}
              className="resize-none overflow-y-auto"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <button
            onClick={resetToDefaults}
            className="cursor-pointer text-xs text-gray-800 hover:text-black"
          >
            Reset to default
          </button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !isDirty}>
              {isSaving && (
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
