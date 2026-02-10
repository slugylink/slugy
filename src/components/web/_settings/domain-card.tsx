"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Globe,
  AlertCircle,
  Trash2,
  RefreshCw,
  Settings2,
  ChevronDown,
  ClockFading,
  MoreVertical,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

import { DomainConfigContent } from "./domain-config-dialog";
import { DeleteDomainDialog } from "./delete-domain-dialog";

// Types
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

interface StatusBadgeConfig {
  label: string;
  className: string;
  icon?: React.ReactNode;
}

// Utility functions
const getStatusInfo = (
  verified: boolean,
  dnsConfigured: boolean,
): StatusBadgeConfig => {
  if (verified && dnsConfigured) {
    return {
      label: "Active",
      className: "rounded-sm bg-green-100/70 text-green-500",
    };
  }

  if (verified && !dnsConfigured) {
    return {
      label: "DNS Pending",
      className: "rounded-sm bg-yellow-100/70 text-yellow-600",
      icon: <AlertCircle className="mr-1 size-3" />,
    };
  }

  if (!verified && dnsConfigured) {
    return {
      label: "Verify Pending",
      className: "rounded-sm bg-blue-100/70 text-blue-600",
      icon: <AlertCircle className="mr-1 size-3" />,
    };
  }

  return {
    label: "Pending",
    className: "rounded-sm bg-red-100/70 text-red-500",
    icon: <ClockFading className="mr-1 size-3" />,
  };
};

const getStatusMessage = (
  verified: boolean,
  dnsConfigured: boolean,
): string => {
  if (verified && dnsConfigured) return "Ready to use";
  if (verified && !dnsConfigured) return "Configure DNS records";
  if (!verified && dnsConfigured) return "Verify domain";
  return "Configure DNS and verify domain";
};

// Sub-components
interface StatusBadgeProps {
  verified: boolean;
  dnsConfigured: boolean;
}

const StatusBadge = ({ verified, dnsConfigured }: StatusBadgeProps) => {
  const { label, className, icon } = getStatusInfo(verified, dnsConfigured);

  return (
    <Badge
      variant={verified && dnsConfigured ? "default" : "secondary"}
      className={className}
    >
      {icon}
      {label}
    </Badge>
  );
};

interface DomainActionsProps {
  domain: CustomDomain;
  isOwnerOrAdmin: boolean;
  isConfigOpen: boolean;
  isVerifying: boolean;
  onSetupClick: () => void;
  onVerify: () => void;
  onDelete: () => void;
}

const DesktopActions = ({
  domain,
  isOwnerOrAdmin,
  isConfigOpen,
  isVerifying,
  onSetupClick,
  onVerify,
  onDelete,
}: DomainActionsProps) => (
  <div className="hidden items-center gap-2 md:flex">
    {(!domain.verified || !domain.dnsConfigured) && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="xs" variant="outline" onClick={onSetupClick}>
            <Settings2 />
            <ChevronDown
              className={cn(
                "text-muted-foreground",
                isConfigOpen && "rotate-180",
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Configure</TooltipContent>
      </Tooltip>
    )}

    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="xs"
          variant="outline"
          onClick={onVerify}
          disabled={isVerifying}
        >
          <RefreshCw className={cn(isVerifying && "animate-spin")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Refresh</TooltipContent>
    </Tooltip>

    {isOwnerOrAdmin && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="xs" variant="outline" onClick={onDelete}>
            <Trash2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>
    )}
  </div>
);

const MobileActions = ({
  domain,
  isOwnerOrAdmin,
  isVerifying,
  onSetupClick,
  onVerify,
  onDelete,
}: DomainActionsProps) => (
  <div className="md:hidden">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="xs" variant="outline">
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {(!domain.verified || !domain.dnsConfigured) && (
          <DropdownMenuItem onClick={onSetupClick}>
            <Settings2 className="mr-2 size-4" /> Configure
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onVerify} disabled={isVerifying}>
          <RefreshCw className="mr-2 size-4" /> Refresh
        </DropdownMenuItem>
        {isOwnerOrAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete}>
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

// Main component
export function DomainCard({
  domain,
  workspaceslug,
  isOwnerOrAdmin,
  onDeleted,
  onUpdated,
  onSetupClick,
}: DomainCardProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleSetupClick = () => {
    onSetupClick?.();
    setIsConfigOpen((prev) => !prev);
  };

  const handleVerify = async () => {
    setIsVerifying(true);

    try {
      const response = await axios.patch(
        `/api/workspace/${workspaceslug}/domains`,
        {
          domainId: domain.id,
          action: "verify",
        },
      );

      const { verified, configured } = response.data;

      if (verified && configured) {
        toast.success("Domain verified and configured successfully");
      } else if (verified && !configured) {
        toast.warning(
          "Domain verified but DNS not configured. Please check DNS records.",
        );
      } else if (!verified && configured) {
        toast.warning("DNS configured but domain verification pending.");
      } else {
        toast.warning("Domain verification and DNS configuration pending.");
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

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const actionProps = {
    domain,
    isOwnerOrAdmin,
    isConfigOpen,
    isVerifying,
    onSetupClick: handleSetupClick,
    onVerify: handleVerify,
    onDelete: handleDelete,
  };

  return (
    <>
      <Card className="gap-0 border shadow-none">
        <CardContent className="flex items-center justify-between gap-0">
          <div className="flex items-center gap-4">
            <div className="hidden size-10 items-center justify-center rounded-full border bg-gradient-to-b from-zinc-50/60 to-zinc-100 md:flex">
              <Globe className="size-5 text-zinc-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm">
                <p className="font-medium">{domain.domain}</p>
                <StatusBadge
                  verified={domain.verified}
                  dnsConfigured={domain.dnsConfigured}
                />
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {getStatusMessage(domain.verified, domain.dnsConfigured)}
              </p>
            </div>
          </div>

          <DesktopActions {...actionProps} />
          <MobileActions {...actionProps} />
        </CardContent>

        {/* Inline configuration accordion */}
        <div className="p-0">
          <Accordion
            type="single"
            collapsible
            value={isConfigOpen ? "config" : undefined}
            onValueChange={(v) => setIsConfigOpen(v === "config")}
            className="w-full gap-0 p-0"
          >
            <AccordionItem value="config" className="p-0">
              <AccordionContent className="border-none p-0">
                <DomainConfigContent domain={domain} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </Card>

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
