"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { DomainConfigDialog } from "./domain-config-dialog";
import { DeleteDomainDialog } from "./delete-domain-dialog";

interface CustomDomain {
  id: string;
  domain: string;
  verified: boolean;
  verificationToken: string | null;
  dnsConfigured: boolean;
  lastChecked: Date | null;
  sslEnabled: boolean;
  sslIssuer: string | null;
  cloudflareCnameTarget: string | null;
  cloudflareStatus: string | null;
  sslExpiresAt: Date | null;
  redirectToWww: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DomainCardProps {
  domain: CustomDomain;
  workspaceslug: string;
  isOwnerOrAdmin: boolean;
  onDeleted: (domainId: string) => void;
  onUpdated: (domain: CustomDomain) => void;
  onSetupClick?: () => void;
}

export function DomainCard({
  domain,
  workspaceslug,
  isOwnerOrAdmin,
  onDeleted,
  onUpdated,
  onSetupClick,
}: DomainCardProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleSetupClick = () => {
    if (onSetupClick) {
      onSetupClick();
    } else {
      setIsConfigDialogOpen(true);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);

    try {
      const response = await axios.patch(
        `/api/workspace/${workspaceslug}/domains`,
        {
          domainId: domain.id,
          action: "verify",
        }
      );

      if (response.data.verified && response.data.configured) {
        toast.success("Domain verified and configured successfully");
      } else if (response.data.verified) {
        toast.success("Domain verified! Please configure DNS records.");
      } else {
        toast.warning("Domain verification pending. Please check DNS records.");
      }

      onUpdated(response.data.domain);
    } catch (error: unknown) {
      console.error("Error verifying domain:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to verify domain";
      toast.error(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusBadge = () => {
    if (domain.verified && domain.dnsConfigured) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="mr-1 size-3" />
          Active
        </Badge>
      );
    } else if (domain.verified) {
      return (
        <Badge variant="secondary">
          <AlertCircle className="mr-1 size-3" />
          DNS Pending
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">
          <XCircle className="mr-1 size-3" />
          Verification Pending
        </Badge>
      );
    }
  };

  return (
    <>
      <Card className="border shadow-none">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
              <Globe className="text-muted-foreground size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{domain.domain}</p>
                {getStatusBadge()}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {domain.verified && domain.dnsConfigured
                  ? "Ready to use"
                  : domain.verified
                    ? "Configure DNS records"
                    : "Verify domain ownership"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(!domain.verified || !domain.dnsConfigured) && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSetupClick}
              >
                <Settings />
                Setup
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleVerify}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              Verify
            </Button>

            {isOwnerOrAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <DomainConfigDialog
        open={isConfigDialogOpen}
        onOpenChange={setIsConfigDialogOpen}
        domain={domain}
      />

      {isOwnerOrAdmin && (
        <DeleteDomainDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          domain={domain}
          workspaceslug={workspaceslug}
          onDeleted={onDeleted}
        />
      )}
    </>
  );
}

