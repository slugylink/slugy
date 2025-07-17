"use client";

import type React from "react";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { LoaderCircle } from "@/utils/icons/loader-circle";

interface ImportResponse {
  message: string;
  errors?: Array<{
    row: number;
    errors: Array<{
      message: string;
      path: string[];
    }>;
  }>;
  error?: string; // Added for API errors
}

interface LinkImportCSVProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceslug: string;
}
export default function LinkImportCSV({
  isOpen,
  onClose,
  workspaceslug,
}: LinkImportCSVProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const router = useRouter();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
    maxSize: 5 * 1024 * 1024, // 5MB limit
    onDropRejected: (fileRejections) => {
      const error = fileRejections[0]?.errors[0];
      if (error?.code === "file-too-large") {
        toast.error("File is too large. Maximum size is 5MB.");
      } else {
        toast.error("Invalid file. Please upload a CSV file.");
      }
    },
  });

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    const promise = (async () => {
      const response = await fetch(`/api/workspace/${workspaceslug}/link/csv`, {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ImportResponse;

      if (!response.ok) {
        if (data.errors) {
          // Handle validation errors
          const errorMessage = data.errors
            .map(
              (error) =>
                `Row ${error.row}: ${error.errors
                  .map((e) => `${e.path.join(".")} - ${e.message}`)
                  .join(", ")}`,
            )
            .join("\n");
          throw new Error(`Validation errors:\n${errorMessage}`);
        } else if (data.error) {
          // Handle API error with 'error' property (e.g., link limit)
          throw new Error(data.error);
        } else if (data.message) {
          throw new Error(data.message);
        } else {
          throw new Error("Failed to import CSV");
        }
      }

      // Revalidate with the correct key pattern
      void mutate(
        (key) => typeof key === "string" && key.includes("/link/get"),
      );

      router.refresh();
      onClose();

      return data.message || "Successfully imported links";
    })();

    toast.promise(promise, {
      loading: "Importing links from CSV...",
      success: (message: string) => message,
      error: (error: Error) => {
        // Show error toast with correct message
        return error.message || "Failed to import CSV";
      },
    });

    promise.finally(() => {
      setIsImporting(false);
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !isImporting && !open && onClose()}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-md border-2 border-dashed p-6 text-center ${
              isDragActive ? "border-primary" : "border-border"
            } ${isImporting ? "pointer-events-none opacity-60" : ""}`}
          >
            <input {...getInputProps()} disabled={isImporting} />
            <Upload className="text-muted-foreground mx-auto h-8 w-8" />
            <p className="text-muted-foreground mt-2 text-sm">
              Drag & drop a CSV file here, or click to select a file
            </p>
            {file && (
              <p className="text-primary mt-2 text-sm">
                Selected file: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
          <div className="text-muted-foreground text-xs">
            <p>Maximum file size: 5MB. Only CSV files are supported.</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!file || isImporting}
            className="w-full"
          >
            {isImporting && (
              <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
            )}{" "}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
