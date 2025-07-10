import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import DateRangePicker from "../_workspace/date-range-picker";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { LoaderCircle } from "@/utils/icons/loader-circle";

const DATE_RANGES = [
  { label: "Last 24 Hours", value: "24h" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 3 Months", value: "3m" },
  { label: "Custom", value: "custom" },
  { label: "All Time", value: "all" },
];

const COLUMNS = [
  { label: "Short link", value: "slug" },
  { label: "Destination URL", value: "url" },
  { label: "Clicks", value: "clicks" },
  { label: "Created at", value: "createdAt" },
  { label: "Link ID", value: "link_id" },
  { label: "Updated at", value: "updatedAt" },
  { label: "Tags", value: "tags" },
  { label: "Archived", value: "archived" },
];

export default function LinkExportCSV({
  isOpen,
  onClose,
  workspaceslug,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceslug: string;
}) {
  const [dateRange, setDateRange] = useState("24h");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(
    undefined,
  );
  const [columns, setColumns] = useState([
    "slug",
    "url",
    "clicks",
    "createdAt",
  ]);
  const [loading, setLoading] = useState(false);

  const handleColumnChange = (col: string) => {
    setColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  };

  const handleCustomRange = (range: DateRange | undefined) => {
    setCustomRange(range);
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        dateRange,
        columns: columns.join(","),
      });
      if (dateRange === "custom" && customRange?.from && customRange?.to) {
        params.append("from", customRange.from.toISOString());
        params.append("to", customRange.to.toISOString());
      }
      const response = await fetch(
        `/api/workspace/${workspaceslug}/link/csv?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to export CSV");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "links_export.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("CSV exported successfully");
      onClose();
    } catch (e) {
      toast.error("Failed to export CSV");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Export links</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="mb-3 block text-sm font-medium">Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full cursor-pointer">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="text-primary mr-2 h-4 w-4" />{" "}
                  <SelectValue placeholder="Select date range" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dateRange === "custom" && (
            <DateRangePicker value={customRange} onChange={handleCustomRange} />
          )}
          <div>
            <Label className="mb-2 block text-sm font-medium">Columns</Label>
            <div className="grid grid-cols-2 gap-2">
              {COLUMNS.map((col) => (
                <label
                  key={col.value}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={columns.includes(col.value)}
                    onCheckedChange={() => handleColumnChange(col.value)}
                    id={`col-${col.value}`}
                  />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
          </div>
          <Button
            className="mt-2 w-full"
            onClick={handleExport}
            disabled={loading}
          >
            {loading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}{" "}
            Export    
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
