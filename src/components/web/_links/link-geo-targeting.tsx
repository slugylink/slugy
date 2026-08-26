"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe, Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES } from "@/constants/countries";
import { MAX_GEO_TARGETS, type GeoTargetMap } from "@/lib/link-targeting";
import { cn } from "@/lib/utils";

type GeoRow = { id: string; country: string; url: string };

interface LinkGeoTargetingProps {
  geo: GeoTargetMap | null;
  setGeo: (geo: GeoTargetMap | null) => void;
  disabled?: boolean;
  locked?: boolean;
}

function mapToRows(geo: GeoTargetMap | null): GeoRow[] {
  if (!geo || Object.keys(geo).length === 0) {
    return [{ id: crypto.randomUUID(), country: "", url: "" }];
  }
  return Object.entries(geo).map(([country, url]) => ({
    id: crypto.randomUUID(),
    country,
    url,
  }));
}

function rowsToGeo(rows: GeoRow[]): GeoTargetMap | null {
  const result: GeoTargetMap = {};
  for (const row of rows) {
    const country = row.country.trim().toLowerCase();
    const url = row.url.trim();
    if (!country || !url) continue;
    result[country] = url;
  }
  return Object.keys(result).length > 0 ? result : null;
}

export default function LinkGeoTargeting({
  geo,
  setGeo,
  disabled = false,
  locked = false,
}: LinkGeoTargetingProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<GeoRow[]>(() => mapToRows(geo));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRows(mapToRows(geo));
      setError(null);
    }
  }, [geo, open]);

  const hasTargets = Boolean(geo && Object.keys(geo).length > 0);
  const usedCountries = useMemo(
    () => new Set(rows.map((row) => row.country).filter(Boolean)),
    [rows],
  );

  const onSave = () => {
    const next = rowsToGeo(rows);
    if (next && Object.keys(next).length > MAX_GEO_TARGETS) {
      setError(`Up to ${MAX_GEO_TARGETS} countries allowed`);
      return;
    }
    for (const row of rows) {
      if (row.country && !row.url.trim()) {
        setError("Each selected country needs a URL");
        return;
      }
      if (row.url.trim() && !row.country) {
        setError("Select a country for each URL");
        return;
      }
    }
    setGeo(next);
    setOpen(false);
  };

  const handleRemove = () => {
    setGeo(null);
    setRows([{ id: crypto.randomUUID(), country: "", url: "" }]);
    setOpen(false);
  };

  const addRow = () => {
    if (rows.length >= MAX_GEO_TARGETS) {
      setError(`Up to ${MAX_GEO_TARGETS} countries allowed`);
      return;
    }
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), country: "", url: "" },
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className={cn("text-xs", disabled && "cursor-not-allowed opacity-60")}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
        >
          {disabled || locked ? (
            <Lock className="p-[1px] font-medium" size={8} />
          ) : (
            <Globe
              className={cn(
                "p-[1px] font-medium",
                hasTargets && "text-blue-500",
              )}
              size={8}
            />
          )}
          Geo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="mb-3">
          <DialogTitle className="font-medium">Geo targeting</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground mb-3 text-sm">
          Send visitors from selected countries to different URLs. Everyone else
          goes to the default destination.
        </p>
        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-end gap-2"
            >
              <div>
                {index === 0 && (
                  <Label className="mb-2 block text-sm font-medium">
                    Country
                  </Label>
                )}
                <Select
                  value={row.country || undefined}
                  onValueChange={(value) => {
                    setRows((prev) =>
                      prev.map((item) =>
                        item.id === row.id ? { ...item, country: value } : item,
                      ),
                    );
                    setError(null);
                  }}
                  disabled={locked}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {COUNTRIES.map((country) => {
                      const taken =
                        usedCountries.has(country.code) &&
                        row.country !== country.code;
                      return (
                        <SelectItem
                          key={country.code}
                          value={country.code}
                          disabled={taken}
                        >
                          {country.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                {index === 0 && (
                  <Label className="mb-2 block text-sm font-medium">URL</Label>
                )}
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={row.url}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRows((prev) =>
                      prev.map((item) =>
                        item.id === row.id ? { ...item, url: value } : item,
                      ),
                    );
                    setError(null);
                  }}
                  autoComplete="off"
                  disabled={locked}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                disabled={locked || rows.length <= 1}
                onClick={() =>
                  setRows((prev) => prev.filter((item) => item.id !== row.id))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={addRow}
          disabled={locked || rows.length >= MAX_GEO_TARGETS}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add country
        </Button>
        <DialogFooter className="flex w-full items-center sm:justify-between">
          <button
            type="button"
            className="cursor-pointer text-xs"
            onClick={handleRemove}
            disabled={locked}
          >
            Remove targeting
          </button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={onSave} disabled={locked}>
              {locked && <Lock className="mr-1 h-3 w-3" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
