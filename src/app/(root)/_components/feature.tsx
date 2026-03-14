"use client";
import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import FeatureLinkCard, {
  DEMO_LINKS,
} from "@/components/web/_features/feature-link-card";
import FeatureQRCodeDesign from "@/components/web/_features/feature-qr-code-design";
import FeatureAnalyticsChart from "@/components/web/_features/feature-chart";
import FeatureLinkPreview from "@/components/web/_features/feature-preview";

const featureCardsData = [
  {
    title: "Link Shortening",
    description: "Create branded, concise links for effective sharing.",
    body: (
      <>
        <FeatureLinkCard className="mx-auto" link={DEMO_LINKS[0]} />
        <FeatureLinkCard
          className="mx-auto w-[97%] shadow-[0_0_16px_rgba(0,0,0,0.08)]"
          link={DEMO_LINKS[1]}
        />
        <FeatureLinkCard className="mx-auto w-[94%]" link={DEMO_LINKS[2]} />
      </>
    ),
  },
  {
    title: "QR Code Generation",
    description: "Instantly generate QR codes for easy scanning.",
    body: (
      <Card className="h-full w-full rounded-b-none border border-b-0 p-2 shadow-[0_0_16px_rgba(0,0,0,0.08)] sm:max-w-[400px] sm:p-3">
        <FeatureQRCodeDesign code="app" />
      </Card>
    ),
  },
  {
    title: "Analytics Dashboard",
    description: "Track link performance with detailed click insights.",
    body: <FeatureAnalyticsChart timePeriod="7d" />,
  },
  {
    title: "Link in Bio",
    description: "Your links in one place for easy sharing.",
    body: (
      <FeatureLinkPreview
        username={"sandip"}
        links={[
          {
            id: "1",
            title: "Portfolio",
            url: "https://slugy.co/sandip",
          },
          {
            id: "2",
            title: "Github",
            url: "https://slugy.co/git",
          },
        ]}
        socials={[]}
        name={"Sandip"}
        bio={"Full Stack Developer"}
        logo={"/logo.svg"}
        initialTheme={"prism"}
      />
    ),
  },
] as const;

const Features = memo(function Features() {
  return (
    <div className="dark:bg-background mx-auto mt-4 max-w-6xl px-2 py-10 text-center sm:mt-6 sm:px-4 sm:py-16">
      {/* Heading */}
      <div className="mb-4 space-y-3 text-2xl font-medium sm:mb-5 sm:space-y-4 sm:text-4xl">
        <h2 className="text-balance">Elevate your brand</h2>
      </div>
      {/* Description */}
      <p className="mx-auto mb-6 max-w-xl text-sm text-zinc-600 sm:mb-8 sm:text-base dark:text-zinc-300">
        Create standout short links with our powerful link management{" "}
        <br className="hidden sm:block" />
        platform that includes robust analytics.
      </p>
      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8">
        {featureCardsData.map((feat, idx) => (
          <Card
            key={feat.title}
            className="rounded-none border-none bg-transparent p-2 pt-6 shadow-none sm:p-3 sm:pt-10"
          >
            <div>
              <div className="relative">
                {/* <div className="absolute inset-x-32 top-6 m-auto aspect-video bg-gradient-to-tr from-yellow-500 via-orange-200 to-violet-300 blur-3xl md:inset-x-20" /> */}
                {/* Feature Image/Body */}
                <div className="relative w-full">
                  <div
                    className={cn(
                      "relative aspect-[16/15] overflow-hidden rounded-[20px] border border-zinc-200/80 bg-zinc-50/20 p-4 sm:aspect-[16/11] sm:p-8 dark:border-zinc-200/40",
                      idx === 1
                        ? "mx-auto flex w-full justify-center"
                        : "space-y-2.5 sm:px-10",
                    )}
                  >
                    {feat.body}
                  </div>
                </div>
                <div className="absolute inset-0 z-0 [background:radial-gradient(100%_100%_at_28%_-0%,transparent_60%,#ffffff_100%)] dark:[background:radial-gradient(100%_100%_at_0%_0%,transparent_0%,#121212_100%)]" />
              </div>
              <CardContent className="mt-3 p-0 pl-1 sm:pl-2">
                <h3 className="mb-1.5 text-start text-base font-medium sm:text-lg">
                  {feat.title}
                </h3>
                <p className="text-muted-foreground text-start text-sm leading-relaxed font-normal sm:text-base">
                  {feat.description}
                </p>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
});

Features.displayName = "Features";

export default Features;
