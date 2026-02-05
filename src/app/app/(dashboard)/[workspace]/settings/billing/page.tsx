import Link from "next/link";
import { Globe, Link2, Tag, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

import type { LucideIcon } from "lucide-react";
import { getBillingData } from "@/server/actions/subscription";
import { getUsages } from "@/server/actions/usages/get-usages";
import { redirect } from "next/navigation";

type UsageMetric = {
  label: string;
  used: number;
  limit: number | "Unlimited";
  helper?: string;
  icon: LucideIcon;
};

export default async function Billing({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;

  const [result, usageData] = await Promise.all([
    getBillingData(workspace),
    getUsages({ workspaceslug: workspace }),
  ]);

  if (!result.success || !result.data) {
    redirect("/app");
  }

  const { plan, usage, limits, billingCycle, subscription } = result.data;

  // Use subscription billing cycle from result.data (from Polar subscription)
  // This shows the actual subscription period, not workspace usage tracking period
  console.log("[Billing Page] Billing cycle from subscription:", billingCycle);

  // Check if user has a paid subscription (not free plan)
  const isPaidPlan = plan.planType && plan.planType.toLowerCase() !== "free";
  
  // Check if subscription is canceled but still active (grace period)
  const isCanceledButActive = subscription?.cancelAtPeriodEnd === true;

  const usageMetrics: UsageMetric[] = [
    {
      label: "Custom Domains",
      used: usage.customDomains,
      limit: limits.customDomains,
      icon: Globe,
    },
    {
      label: "Bio Links",
      used: usage.bioLinksPerGallery,
      limit: limits.bioLinksPerGallery,
      icon: Link2,
    },
    {
      label: "Tags",
      used: usage.tags,
      limit: limits.tags,
      icon: Tag,
    },
    {
      label: "Teammates",
      used: usage.teammates,
      limit: limits.teammates,
      icon: Users,
    },
  ];
  return (
    <div className="space-y-8">
      {isCanceledButActive && (
        <Alert variant="default" className="bg-yellow-300/10">
          <AlertDescription className="">
            Your subscription has been canceled and will end on{" "}
            <span className="font-medium">{billingCycle.end}</span>. You'll continue to have access to{" "}
            {plan.name} features until then, after which you'll be moved to the Free plan.
          </AlertDescription>
        </Alert>
      )}
      
      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-6 px-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div>
              <CardTitle className="text-md">
                {plan.name} Plan
                {isCanceledButActive && (
                  <span className="ml-2 text-sm font-normal text-destructive">
                    [Canceling]
                  </span>
                )}
              </CardTitle>
            </div>
            <p className="text-muted-foreground text-sm">
              <span className=" font-medium">
                Billing cycle:
              </span>{" "}
              {billingCycle.start} - {billingCycle.end}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {isPaidPlan ? (
              <>
                <Button variant={"outline"} asChild>
                  <Link href="/api/subscription/manage">
                    Manage
                  </Link>
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link href="billing/upgrade">
                  Upgrade
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="">
        <Card className="">
          <CardContent className="grid border-y border-r px-0 sm:grid-cols-2 lg:grid-cols-4">
            {usageMetrics.map((metric) => {
              const Icon = metric.icon;
              const limitLabel =
                typeof metric.limit === "number"
                  ? metric.limit === 0
                    ? "Not available"
                    : metric.limit
                  : metric.limit;
              const progress =
                typeof metric.limit === "number" && metric.limit > 0
                  ? (metric.used / metric.limit) * 100
                  : undefined;

              return (
                <div key={metric.label} className="border-l p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <span>
                        <Icon className="size-4" />
                      </span>
                      {metric.label}
                    </div>
                  </div>
                  <div className="text-muted-foreground mt-4 text-sm">
                    {`${metric.used} / ${limitLabel}`}
                  </div>
                  {progress !== undefined && (
                    <Progress value={progress} className="mt-2.5 h-1" />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
