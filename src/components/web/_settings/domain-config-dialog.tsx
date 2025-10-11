"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface CustomDomain {
  id: string;
  domain: string;
  verified: boolean;
  verificationToken: string | null;
  dnsConfigured: boolean;
  cloudflareCnameTarget: string | null;
  cloudflareStatus: string | null;
}

interface DomainConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: CustomDomain;
}

export function DomainConfigDialog({
  open,
  onOpenChange,
  domain,
}: DomainConfigDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const isApexDomain =
    !domain.domain.includes("www") && domain.domain.split(".").length === 2;

  const getDnsRecords = () => {
    // Always use Vercel's CNAME target for SSL
    const cnameTarget = "cname.vercel-dns.com";
    
    if (isApexDomain) {
      return [
        {
          type: "A",
          name: "@",
          value: "76.76.21.21",
          description: "Points your apex domain to Vercel",
        },
        {
          type: "CNAME",
          name: "www",
          value: cnameTarget,
          description: "Points www subdomain to Vercel",
        },
      ];
    }

    return [
      {
        type: "CNAME",
        name: domain.domain.split(".")[0] || "@",
        value: cnameTarget,
        description: "Points your subdomain to Vercel (SSL handled by Vercel)",
      },
    ];
  };

  // Verification record for Vercel
  const verificationRecord = domain.verificationToken
    ? {
        type: "TXT",
        name: "_vercel",
        value: domain.verificationToken,
      }
    : null;

  const dnsRecords = getDnsRecords();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Domain Configuration</DialogTitle>
          <DialogDescription>
            Follow these steps to configure your custom domain{" "}
            <span className="font-medium text-foreground">{domain.domain}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* TXT Verification is skipped for Cloudflare DNS - users only need CNAME */}

          {/* Step 2: DNS Configuration */}
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-medium">
                  1
                </div>
                <h3 className="font-medium">Configure DNS Record</h3>
              </div>
              {domain.dnsConfigured ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="mr-1 size-3" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="outline">
                  <AlertCircle className="mr-1 size-3" />
                  Pending
                </Badge>
              )}
            </div>

            <p className="text-muted-foreground mb-4 text-sm">
              Add these DNS records in your Cloudflare (or DNS provider) to point your domain to Vercel:
            </p>

            <div className="space-y-3">
              {dnsRecords.map((record, index) => (
                <div key={index} className="bg-muted rounded-lg p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {record.type} Record
                    </Badge>
                    <p className="text-muted-foreground text-xs">
                      {record.description}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-muted-foreground text-xs">Name</p>
                        <p className="font-mono text-sm">{record.name}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(record.name, `dns-name-${index}`)
                        }
                      >
                        {copiedField === `dns-name-${index}` ? (
                          <CheckCircle2 className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-muted-foreground text-xs">Value</p>
                        <p className="font-mono text-sm">{record.value}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(record.value, `dns-value-${index}`)
                        }
                      >
                        {copiedField === `dns-value-${index}` ? (
                          <CheckCircle2 className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Verification Record (if needed) */}
              {verificationRecord && (
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="default" className="text-xs bg-blue-600">
                      {verificationRecord.type} Record (Verification)
                    </Badge>
                    <p className="text-muted-foreground text-xs">
                      Required for Vercel domain verification
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-muted-foreground text-xs">Name</p>
                        <p className="font-mono text-sm">{verificationRecord.name}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(verificationRecord.name, `verification-name`)
                        }
                      >
                        {copiedField === `verification-name` ? (
                          <CheckCircle2 className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-muted-foreground text-xs">Value</p>
                        <p className="font-mono break-all text-xs">{verificationRecord.value}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(verificationRecord.value, `verification-value`)
                        }
                      >
                        {copiedField === `verification-value` ? (
                          <CheckCircle2 className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="size-4" />
              Need Help?
            </h4>
            <p className="text-muted-foreground mb-3 text-sm">
              DNS changes can take up to 48 hours to propagate, though they usually
              happen much faster. After adding the records, click the &quot;Verify&quot; button
              to check the status.
            </p>
            <Button
              size="sm"
              variant="outline"
              asChild
            >
              <a
                href="https://vercel.com/docs/projects/domains/add-a-domain"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" />
                View Vercel Domain Documentation
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

