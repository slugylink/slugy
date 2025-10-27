"use client";

import { useState, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
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
import { Upload, Link as LinkIcon, Settings, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LinkCustomMetadataProps {
  linkId: string;
  linkUrl: string;
  currentImage: string | null;
  currentTitle: string | null;
  currentDescription: string | null;
  workspaceslug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
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
}: LinkCustomMetadataProps) {
  const [image, setImage] = useState(currentImage || "");
  const [title, setTitle] = useState(currentTitle || "");
  const [description, setDescription] = useState(currentDescription || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetToDefaults = useCallback(async () => {
    try {
      const response = await axios.get(
        `/api/metadata?url=${encodeURIComponent(linkUrl)}`,
      );
      const metadata = response.data;

      setImage(metadata.image || "");
      setTitle(metadata.title || "");
      setDescription(metadata.description || "");
      toast.success("Reset to default metadata");
    } catch (error) {
      console.error("Failed to fetch default metadata:", error);
      toast.error("Failed to reset metadata");
    }
  }, [linkUrl]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setIsUploading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);

      // Upload to S3
      const uploadResponse = await axios.post("/api/temp/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const imageUrl = uploadResponse.data.url;
      setImage(imageUrl);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await axios.patch(
        `/api/workspace/${workspaceslug}/link/${linkId}/update`,
        {
          image: image || null,
          title: title || null,
          description: description || null,
        },
      );

      toast.success("Link preview metadata updated successfully");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update metadata:", error);
      toast.error("Failed to update link preview metadata");
    } finally {
      setIsSaving(false);
    }
  }, [image, title, description, workspaceslug, linkId, onSave, onOpenChange]);

  const handleCancel = useCallback(() => {
    setImage(currentImage || "");
    setTitle(currentTitle || "");
    setDescription(currentDescription || "");
    onOpenChange(false);
  }, [currentImage, currentTitle, currentDescription, onOpenChange]);

  const isDirty =
    image !== currentImage ||
    title !== currentTitle ||
    description !== currentDescription;

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
                      } catch {
                        toast.error("Invalid URL");
                      }
                    }
                  }}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="relative overflow-hidden rounded-lg border-2 border-dashed"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
              />

              {image ? (
                <div className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt="Preview"
                    className="aspect-video w-full object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => setImage("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center aspect-video justify-center text-center">
                  {isUploading ? (
                    <LoaderCircle className="mb-2 h-8 w-8 animate-spin" />
                  ) : (
                    <Upload className="text-muted-foreground mb-2 h-8 w-8" />
                  )}
                  <p className="text-muted-foreground text-sm">
                    {isUploading
                      ? "Uploading..."
                      : "Drag and drop or click to upload"}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Recommended: 1200 x 630 pixels
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
                  {description.length}/{DESCRIPTION_MAX}
                </span>
                {/* <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Settings className="h-4 w-4" />
                </Button> */}
              </div>
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              maxLength={DESCRIPTION_MAX}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="ghost" onClick={resetToDefaults}>
            Reset to default
          </Button>
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
