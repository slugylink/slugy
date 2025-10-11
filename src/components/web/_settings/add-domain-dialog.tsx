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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!domain.trim()) {
      toast.error("Please enter a domain");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `/api/workspace/${workspaceslug}/domains`,
        {
          domain: domain.trim(),
        }
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
              Enter the domain you want to use for your short links. Make sure you
              have access to configure DNS records for this domain.
            </DialogDescription>
          </DialogHeader>

          <div className="my-6">
            <Input
              placeholder="example.com or go.example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
            <p className="text-muted-foreground mt-2 text-xs">
              You can use either an apex domain (example.com) or a subdomain
              (go.example.com)
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="animate-spin" />}
              Add Domain
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

