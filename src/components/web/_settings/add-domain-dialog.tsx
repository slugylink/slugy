"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { z } from "zod";

interface CustomDomain {
  id: string;
  domain: string;
  verified: boolean;
  verificationToken: string | null;
  dnsConfigured: boolean;
  lastChecked: Date | null;
  sslEnabled: boolean;
  sslIssuer: string | null;
  sslExpiresAt: Date | null;
  redirectToWww: boolean;
  createdAt: Date;
  updatedAt: Date;
  cloudflareCnameTarget: string | null;
  cloudflareStatus: string | null;
}

interface AddDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceslug: string;
  onDomainAdded: (domain: CustomDomain, showSetup?: boolean) => void;
}

export function AddDomainDialog({
  open,
  onOpenChange,
  workspaceslug,
  onDomainAdded,
}: AddDomainDialogProps) {
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const subdomainSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: "Please enter a domain" })
    .refine(
      (val) => !val.startsWith("http://") && !val.startsWith("https://"),
      {
        message: "Do not include http(s)://",
      },
    )
    .refine((val) => !val.includes("/"), {
      message: "Do not include paths or slashes",
    })
    .refine((val) => val.split(".").length >= 3, {
      message: "Enter a subdomain like go.example.com",
    })
    .refine(
      (val) => {
        const labels = val.split(".");
        return labels.every(
          (label) =>
            /^[a-z0-9-]{1,63}$/i.test(label) &&
            !label.startsWith("-") &&
            !label.endsWith("-"),
        );
      },
      {
        message: "Use letters, numbers, and hyphens only",
      },
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = subdomainSchema.safeParse(domain);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Invalid subdomain";
      toast.error(msg);
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `/api/workspace/${workspaceslug}/domains`,
        {
          domain: parsed.data,
        },
      );

      const addedDomain = response.data.domain;
      const needsVerification = response.data.verificationRecord;

      if (needsVerification) {
        toast.success("Domain added! Please complete verification.");
      } else {
        toast.success("Domain added successfully!");
      }

      // Pass the domain and indicate if setup dialog should open
      onDomainAdded(addedDomain, needsVerification);
      setDomain("");
    } catch (error: unknown) {
      console.error("Error adding domain:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add domain";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
      setDomain("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Custom Domain</DialogTitle>
            <DialogDescription>
              Enter the domain you want to use for your short links. 
            </DialogDescription>
          </DialogHeader>

          <div className="my-6">
            <Input
              placeholder="go.example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
            <p className="text-muted-foreground mt-2 text-xs">
              Recommended to use a subdomain (e.g., go.example.com)
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || domain.trim().length === 0}>
              {isLoading && <LoaderCircle className="animate-spin" />}
              Add Domain
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
