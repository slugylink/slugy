import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/web/_links/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClockFading } from "lucide-react";
import { Input } from "@/components/ui/input";
import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface LinkExpirationProps {
  expiration: string | null;
  setExpiration: (expiration: string | null) => void;
  expirationUrl: string | null;
  setExpirationUrl: (expirationUrl: string | null) => void;
  handleExpirationSave?: (expiration: string | null) => void;
}

export default function LinkExpiration({
  expiration,
  setExpiration,
  expirationUrl,
  setExpirationUrl,
  handleExpirationSave,
}: LinkExpirationProps) {
  const [open, setOpen] = useState(false);
  const [localExpiration, setLocalExpiration] = useState<string>(
    expiration || "",
  );
  const [localExpirationUrl, setLocalExpirationUrl] = useState<string>(
    expirationUrl || "",
  );

  useEffect(() => {
    setLocalExpiration(expiration || "");
  }, [expiration]);

  useEffect(() => {
    setLocalExpirationUrl(expirationUrl || "");
  }, [expirationUrl]);

  const onSave = () => {
    setExpiration(localExpiration || null);
    setExpirationUrl(
      localExpirationUrl.trim() === "" ? null : localExpirationUrl,
    );
    if (handleExpirationSave) handleExpirationSave(localExpiration || null);
    setOpen(false);
  };

  const handleRemoveExpiration = () => {
    setExpiration(null);
    setExpirationUrl(null);
    setLocalExpiration("");
    setLocalExpirationUrl("");
    if (handleExpirationSave) handleExpirationSave(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="text-xs" type="button" variant="outline" size="sm">
          <ClockFading
            className={cn("p-[1px] font-medium", expiration && "text-blue-500")}
            size={8}
          />
          Expiration
        </Button>
      </DialogTrigger>
      <DialogContent className=" sm:max-w-md">
        <DialogHeader className="mb-3">
          <DialogTitle className="font-medium">Link Expiration</DialogTitle>
        </DialogHeader>
        <DateTimePicker
          value={localExpiration}
          onChange={(val) => setLocalExpiration(val || "")}
        />
        <div className="mt-2">
          <Label
            htmlFor="expiration-url"
            className="mb-3 block text-sm font-medium"
          >
            Expiration URL{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="expiration-url"
            type="url"
            placeholder="https://example.com"
            value={localExpirationUrl}
            onChange={(e) => setLocalExpirationUrl(e.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter className="flex w-full items-center sm:justify-between">
          <button
            type="button"
            className="cursor-pointer text-xs"
            onClick={handleRemoveExpiration}
          >
            Remove expiration
          </button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={onSave}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
