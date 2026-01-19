"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowRight, Info, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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

interface CSVRow {
  slug: string;
  url: string;
  description: string;
  tags: string;
}

type CSVField = keyof CSVRow;

interface LinkImportCSVProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceslug: string;
}

type ParsedCSV = { headers: string[]; rows: string[][] };

const NONE_VALUE = "__none__";
const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5MB limit

const EMPTY_PARSED_CSV: ParsedCSV = { headers: [], rows: [] };
const EMPTY_MAPPING: Record<CSVField, string> = {
  slug: NONE_VALUE,
  url: NONE_VALUE,
  description: NONE_VALUE,
  tags: NONE_VALUE,
};

const MAPPING_FIELDS: Array<{
  field: CSVField;
  label: string;
  required: boolean;
}> = [
  // Order requested: URL -> Slug -> Description -> Tags
  { field: "url", label: "URL", required: true },
  { field: "slug", label: "Slug", required: false },
  { field: "description", label: "Description", required: false },
  { field: "tags", label: "Tags", required: false },
];

function normalizeHeader(input: string): string {
  return input
    .replace(/^\uFEFF/, "") // strip BOM
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, " ");
}

function guessDefaultMapping(headers: string[]): Record<CSVField, string> {
  const normalized = headers.map((h) => normalizeHeader(h));

  const findByAliases = (aliases: string[]) => {
    const idx = normalized.findIndex((h) => aliases.includes(h));
    return idx >= 0 ? headers[idx] : NONE_VALUE;
  };

  // Dub-style common names support
  return {
    slug: findByAliases(["slug", "short link", "shortlink", "short url", "short"]),
    url: findByAliases([
      "url",
      "destination url",
      "destination",
      "long url",
      "original url",
      "target url",
      "link",
    ]),
    description: findByAliases(["description", "title", "name"]),
    tags: findByAliases(["tags", "tag", "labels", "label"]),
  };
}

function parseCSVToMatrix(text: string): ParsedCSV {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headerLine = lines[0];
  const rawHeaders = parseCSVLine(headerLine).map((h) => h.replace(/^\uFEFF/, ""));

  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    rows.push(parseCSVLine(lines[i]));
  }
  return { headers: rawHeaders, rows };
}

// Parse a single CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);
  return result;
}

// Convert rows back to CSV format
function rowsToCSV(rows: CSVRow[]): string {
  const headers = ["slug", "url", "description", "tags"];
  const lines = [headers.join(",")];

  for (const row of rows) {
    const values = [
      escapeCSVField(row.slug),
      escapeCSVField(row.url),
      escapeCSVField(row.description),
      escapeCSVField(row.tags),
    ];
    lines.push(values.join(","));
  }

  return lines.join("\n");
}

// Escape CSV field if it contains commas or quotes
function escapeCSVField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function buildRowsFromMapping(
  parsed: ParsedCSV,
  mapping: Record<CSVField, string>,
): CSVRow[] {
  const headerIndex = new Map<string, number>();
  parsed.headers.forEach((h, idx) => headerIndex.set(h, idx));

  const getValue = (row: string[], field: CSVField) => {
    const mappedHeader = mapping[field];
    if (!mappedHeader || mappedHeader === NONE_VALUE) return "";
    const idx = headerIndex.get(mappedHeader);
    if (idx === undefined) return "";
    return (row[idx] ?? "").trim();
  };

  return parsed.rows.map((row) => ({
    slug: getValue(row, "slug"),
    url: getValue(row, "url"),
    description: getValue(row, "description"),
    tags: getValue(row, "tags"),
  }));
}

function formatImportError(data: ImportResponse): string {
  if (data.errors?.length) {
    const errorMessage = data.errors
      .map(
        (error) =>
          `Row ${error.row}: ${error.errors
            .map((e) => `${e.path.join(".")} - ${e.message}`)
            .join(", ")}`,
      )
      .join("\n");
    return `Validation errors:\n${errorMessage}`;
  }

  if (data.error) return data.error;
  if (data.message) return data.message;
  return "Failed to import CSV";
}

async function postCsvImport(params: {
  workspaceslug: string;
  sourceFileName: string;
  parsedCsv: ParsedCSV;
  mapping: Record<CSVField, string>;
}): Promise<string> {
  const csvRows = buildRowsFromMapping(params.parsedCsv, params.mapping);
  const csvContent = rowsToCSV(csvRows);
  const csvBlob = new Blob([csvContent], { type: "text/csv" });
  const csvFile = new File([csvBlob], params.sourceFileName, { type: "text/csv" });

  const formData = new FormData();
  formData.append("file", csvFile);

  const response = await fetch(`/api/workspace/${params.workspaceslug}/link/csv`, {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as ImportResponse;
  if (!response.ok) throw new Error(formatImportError(data));

  return data.message || "Successfully imported links";
}

export default function LinkImportCSV({
  isOpen,
  onClose,
  workspaceslug,
}: LinkImportCSVProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedCsv, setParsedCsv] = useState<ParsedCSV>(EMPTY_PARSED_CSV);
  const [mapping, setMapping] =
    useState<Record<CSVField, string>>(EMPTY_MAPPING);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const router = useRouter();

  const reset = useCallback(() => {
    setFile(null);
    setParsedCsv(EMPTY_PARSED_CSV);
    setMapping(EMPTY_MAPPING);
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);

    try {
      const text = await selectedFile.text();
      const parsed = parseCSVToMatrix(text);

      if (parsed.rows.length === 0) {
        toast.error("CSV file is empty or has no valid data");
        reset();
        return;
      }

      setParsedCsv(parsed);
      setMapping(guessDefaultMapping(parsed.headers));
      toast.success(`Parsed ${parsed.rows.length} row(s) from CSV`);
    } catch (error) {
      console.error("Error parsing CSV:", error);
      toast.error("Failed to parse CSV file. Please check the format.");
      reset();
    } finally {
      setIsParsing(false);
    }
  }, [reset]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
    maxSize: MAX_CSV_BYTES,
    onDropRejected: (fileRejections) => {
      const error = fileRejections[0]?.errors[0];
      if (error?.code === "file-too-large") {
        toast.error("File is too large. Maximum size is 5MB.");
      } else {
        toast.error("Invalid file. Please upload a CSV file.");
      }
    },
  });

  const canSubmitImport =
    Boolean(file) && parsedCsv.rows.length > 0 && mapping.url !== NONE_VALUE;

  const handleImport = useCallback(() => {
    if (!file || !canSubmitImport) return;

    setIsImporting(true);

    const promise = postCsvImport({
      workspaceslug,
      sourceFileName: file.name,
      parsedCsv,
      mapping,
    })
      .then((message) => {
        // Revalidate with the correct key pattern
        void mutate((key) => typeof key === "string" && key.includes("/link/get"));
        router.refresh();
        onClose();
        return message;
      })
      .finally(() => {
        setIsImporting(false);
      });

    toast.promise(promise, {
      loading: "Importing links from CSV...",
      success: (message: string) => message,
      error: (error: Error) => error.message || "Failed to import CSV",
    });
  }, [canSubmitImport, file, mapping, onClose, parsedCsv, router, workspaceslug]);

  const handleMappingChange = (field: CSVField, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const hasParsedData = parsedCsv.headers.length > 0 && parsedCsv.rows.length > 0;
  const isUrlMapped = mapping.url !== NONE_VALUE;
  const canImport = hasParsedData && isUrlMapped && !isImporting;

  const selectedFileText = useMemo(() => {
    if (!file) return null;
    return `Selected file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
  }, [file]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !isImporting && !open && onClose()}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0.5">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 flex-1 overflow-hidden">
          {!hasParsedData ? (
            <>
              <div
                {...getRootProps()}
                className={`cursor-pointer rounded-md border-2 border-dashed p-6 text-center ${
                  isDragActive ? "border-primary" : "border-border"
                } ${isImporting || isParsing ? "pointer-events-none opacity-60" : ""}`}
              >
                <input {...getInputProps()} disabled={isImporting || isParsing} />
                {isParsing ? (
                  <>
                    <LoaderCircle className="text-muted-foreground mx-auto h-4 w-4 animate-spin" />
                    <p className="text-muted-foreground mt-2 text-sm">
                      Parsing CSV file...
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="text-muted-foreground mx-auto h-8 w-8" />
                    <p className="text-muted-foreground mt-2 text-sm">
                      Drag & drop a CSV file here, or click to select a file
                    </p>
                  </>
                )}
                {file && !isParsing && (
                  <p className="text-primary mt-2 text-sm">
                    {selectedFileText}
                  </p>
                )}
              </div>
              <div className="text-muted-foreground text-xs flex items-center gap-1 flex-wrap">
                <p>Max file size: 5MB. Only CSV files are supported.</p>
                <div className="">
                  <span className="text-xs text-black">CSV Format</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-muted-foreground ml-2 cursor-pointer">
                          <Info className="inline h-4 w-4" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="">
                        <div className="text-xs">
                          <div className="mb-1 font-semibold">
                            Required CSV columns:
                          </div>
                          <table className="border-collapse border text-left text-xs">
                            <thead>
                              <tr>
                                <th className="border px-2 py-1">slug</th>
                                <th className="border px-2 py-1">url</th>
                                <th className="border px-2 py-1">description</th>
                                <th className="border px-2 py-1">tags</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border px-2 py-1">optional</td>
                                <td className="border px-2 py-1">required</td>
                                <td className="border px-2 py-1">optional</td>
                                <td className="border px-2 py-1">optional</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4 flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Parsed {parsedCsv.rows.length} rows</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    reset();
                  }}
                  disabled={isImporting}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>

              {/* Dub-style mapping */}
              <div className="rounded-md border p-3">
                <div className="mb-2 text-sm font-medium">Map CSV columns</div>

                {/* Column headers (Dub-style) */}
                <div className="mb-3 hidden grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs font-medium text-muted-foreground sm:grid">
                  <div className="px-1">CSV DATA COLUMN</div>
                  <div />
                  <div className="px-1">APP DATA FIELD</div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {MAPPING_FIELDS.map(({ field, label, required }) => (
                    <div
                      key={field}
                      className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"
                    >
                      <Select
                        value={mapping[field]}
                        onValueChange={(v) => handleMappingChange(field, v)}
                        disabled={isImporting}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>— Not mapped —</SelectItem>
                          {parsedCsv.headers.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <ArrowRight className="h-4 w-4 text-muted-foreground" />

                      <div className="flex items-center justify-between rounded-md border px-3 py-2">
                        <Label className="text-sm">
                          {label}
                          {required ? (
                            <span className="ml-1 text-destructive">*</span>
                          ) : null}
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>

                {!isUrlMapped && (
                  <p className="mt-2 text-xs text-destructive">
                    Map a CSV column to <strong>URL</strong> to enable import.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!canImport}
            className="w-full sm:w-auto"
          >
            {isImporting && (
              <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
            )}{" "}
            Import {hasParsedData && `(${parsedCsv.rows.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
