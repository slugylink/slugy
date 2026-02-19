"use client";
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import Image from "next/image";
import { toast } from "sonner";
import axios from "axios";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "@/utils/icons/loader-circle";

interface WorkspaceLogoFormProps {
  initialData: {
    id: string;
    logo?: string;
    name: string;
    slug: string;
  };
  userId: string;
  workspaceslug: string;
}

const WorkspaceLogoForm = ({
  initialData,
  workspaceslug,
}: WorkspaceLogoFormProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.includes("image")) {
      toast.error("Please upload an image file");
      return;
    }

    // Check file size (200KB)
    if (file.size > 200 * 1024) {
      toast.error("File size should be less than 200KB");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      await axios.patch(
        `/api/workspace/${workspaceslug}/settings/logo`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      toast.success("Logo updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };
  return (
    <Card className="bg-background">
      <CardContent className="bg-background space-y-4">
        <div className="flex items-center gap-6">
          <div className="relative size-20 overflow-hidden rounded-full border">
            {initialData.logo ? (
              <Image
                src={initialData.logo}
                alt="Workspace Logo"
                fill
                className="object-cover"
                sizes={"(max-width: 768px) 100vw, 50vw"}
              />
            ) : (
              <Image
                src={`https://avatar.vercel.sh/${initialData.slug}`}
                alt="Default Workspace Logo"
                fill
                className="object-cover"
                sizes={"(max-width: 768px) 100vw, 50vw"}
              />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="relative"
                disabled={isUploading}
              >
                {isUploading ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
                <input
                  type="file"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={handleImageUpload}
                  accept="image/png,image/jpeg"
                  disabled={isUploading}
                />
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AiOutlineQuestionCircle className="cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Upload a square image in PNG or JPEG format (max 200KB).
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkspaceLogoForm;
