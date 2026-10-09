import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import React from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { cn } from "@/lib/utils";
import { Geist, Geist_Mono } from "next/font/google";
import LegacyFreeUpgradePopup from "@/components/web/_billing/legacy-free-upgrade-popup";
import { CaptureSlugyId } from "@/components/web/_analytics/capture-slugy-id";
import { TrackSignupLead } from "@/components/web/_analytics/track-signup-lead";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// App dashboard/auth/onboarding must never be indexed. On app.slugy.co the
// paths are "/" and "/:workspace" (not "/app/*"), so robots.txt disallow
// rules for "/app/" do not cover them — metadata noindex is the real guard.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: RootLayoutProps) => {
  return (
    <div className={cn("min-h-screen", geistSans.variable, geistMono.variable)}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <div className="h-full">{children}</div>
        <CaptureSlugyId />
        <TrackSignupLead />
        <LegacyFreeUpgradePopup />
        <SpeedInsights />
      </ThemeProvider>
    </div>
  );
};

export default AppLayout;
