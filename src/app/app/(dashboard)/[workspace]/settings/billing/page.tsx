import Link from "next/link";
import { ArrowUpRight, Globe, Link2, Tag, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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

  const { plan, usage, limits } = result.data;

  const billingCycle = usageData?.usage
    ? {
        start: new Date(usageData.usage.periodStart).toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
            year: "numeric",
          },
        ),
        end: new Date(usageData.usage.periodEnd).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      }
    : {
        start: "N/A",
        end: "N/A",
      };

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
      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-6 px-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div>
              <CardTitle className="text-md">{plan.name} Plan</CardTitle>
            </div>
            <p className="text-muted-foreground text-sm">
              <span className="text-muted font-medium">
                Billing cycle:
              </span>{" "}
              {billingCycle.start} - {billingCycle.end}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild size="lg">
              <Link href="billing/upgrade">
                Upgrade <ArrowUpRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg">
              View invoices
            </Button>
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
