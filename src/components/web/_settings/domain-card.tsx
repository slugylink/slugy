"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import axios from "axios";
import { DomainConfigContent } from "./domain-config-dialog";
import { DeleteDomainDialog } from "./delete-domain-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
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
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleSetupClick = () => {
    if (onSetupClick) {
      onSetupClick();
    }
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

      if (response.data.verified && response.data.configured) {
        toast.success("Domain verified and configured successfully");
      } else if (response.data.verified) {
        toast.success("Domain verified successfully");
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
        <Badge
          variant="default"
          className="rounded-sm bg-green-100/70 text-green-500"
        >
          Active
        </Badge>
      );
    } else if (domain.verified) {
      return (
        <Badge variant="secondary" className="rounded-sm">
          <AlertCircle className="mr-1 size-3" />
          DNS Pending
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="secondary"
          className="rounded-sm bg-red-100/70 text-red-500"
        >
          <ClockFading className="mr-1 size-3" />
          Pending
        </Badge>
      );
    }
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
                {getStatusBadge()}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {domain.verified && domain.dnsConfigured
                  ? "Ready to use"
                  : "Configure DNS records"}
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {(!domain.verified || !domain.dnsConfigured) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={handleSetupClick}
                  >
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
                  onClick={handleVerify}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <RefreshCw className="animate-spin" />
                  ) : (
                    <RefreshCw />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>

            {isOwnerOrAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            )}
          </div>
          {/* mobile dropdown */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="xs" variant="outline">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {(!domain.verified || !domain.dnsConfigured) && (
                  <DropdownMenuItem onClick={handleSetupClick}>
                    <Settings2 className="mr-2 size-4" /> Configure
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleVerify} disabled={isVerifying}>
                  <RefreshCw className="mr-2 size-4" /> Refresh
                </DropdownMenuItem>
                {isOwnerOrAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="mr-2 size-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
