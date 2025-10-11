"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddDomainDialog } from "./add-domain-dialog";
import { DomainCard } from "./domain-card";
import { DomainConfigDialog } from "./domain-config-dialog";
import { Badge } from "@/components/ui/badge";

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

interface DomainsClientProps {
  workspaceslug: string;
  initialDomains: CustomDomain[];
  maxDomains: number;
  isOwnerOrAdmin: boolean;
}

export default function DomainsClient({
  workspaceslug,
  initialDomains,
  maxDomains,
  isOwnerOrAdmin,
}: DomainsClientProps) {
  const router = useRouter();
  const [domains, setDomains] = useState<CustomDomain[]>(initialDomains);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDomainForSetup, setSelectedDomainForSetup] = useState<CustomDomain | null>(null);

  const canAddDomain = maxDomains > 0 && domains.length < maxDomains;

  const handleDomainAdded = (newDomain: CustomDomain, showSetup?: boolean) => {
    setDomains((prev) => [newDomain, ...prev]);
    setIsAddDialogOpen(false);
    
    // Refresh server data
    router.refresh();
    
    // Automatically open setup dialog if verification is needed
    if (showSetup) {
      setTimeout(() => {
        setSelectedDomainForSetup(newDomain);
      }, 300);
    }
  };

  const handleDomainDeleted = (domainId: string) => {
    setDomains((prev) => prev.filter((d) => d.id !== domainId));
    // Refresh server data
    router.refresh();
  };

  const handleDomainUpdated = (updatedDomain: CustomDomain) => {
    setDomains((prev) =>
      prev.map((d) => (d.id === updatedDomain.id ? updatedDomain : d))
    );
    // Refresh server data
    router.refresh();
  };

  return (
    <>
      <Card className="border shadow-none">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Custom Domains</CardTitle>
              <CardDescription className="mt-1.5">
                Add custom domains to use for your short links. You can add up to{" "}
                {maxDomains} custom domain{maxDomains !== 1 ? "s" : ""}.
              </CardDescription>
            </div>
            <Button
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus />
                Add Domain
              </Button>
            {isOwnerOrAdmin && maxDomains > 0 && (
              <Button
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
                disabled={!canAddDomain}
              >
                <Plus />
                Add Domain
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {maxDomains === 0 && domains.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
              <p className="text-muted-foreground mb-4 text-sm">
                Custom domains are not available on your current plan.
              </p>
              <p className="text-muted-foreground mb-4 text-xs">
                To enable custom domains, you need to upgrade your plan. Custom domains allow you to use your own domain (e.g., go.yourdomain.com) for short links.
              </p>
            </div>
          ) : domains.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
              <p className="text-muted-foreground mb-4 text-sm">
                No custom domains added yet. Add your first domain to get started.
              </p>
              {isOwnerOrAdmin && (
                <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus />
                  Add Domain
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {maxDomains > 0 && (
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    {domains.length} of {maxDomains} domain
                    {maxDomains !== 1 ? "s" : ""} used
                  </p>
                  {!canAddDomain && (
                    <Badge variant="secondary">Limit reached</Badge>
                  )}
                </div>
              )}
              {maxDomains === 0 && domains.length > 0 && (
                <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-50 dark:bg-amber-950/20 p-3">
                  <p className="text-amber-800 dark:text-amber-200 text-sm">
                    ⚠️ Your plan doesn&apos;t include custom domains. Existing domains will continue to work, but you can&apos;t add new ones.
                  </p>
                </div>
              )}
              {domains.map((domain) => (
                <DomainCard
                  key={domain.id}
                  domain={domain}
                  workspaceslug={workspaceslug}
                  isOwnerOrAdmin={isOwnerOrAdmin}
                  onDeleted={handleDomainDeleted}
                  onUpdated={handleDomainUpdated}
                  onSetupClick={() => setSelectedDomainForSetup(domain)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isOwnerOrAdmin && (
        <>
          <AddDomainDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            workspaceslug={workspaceslug}
            onDomainAdded={handleDomainAdded}
          />
          
          {selectedDomainForSetup && (
            <DomainConfigDialog
              open={!!selectedDomainForSetup}
              onOpenChange={(open) => !open && setSelectedDomainForSetup(null)}
              domain={selectedDomainForSetup}
            />
          )}
        </>
      )}
    </>
  );
}

