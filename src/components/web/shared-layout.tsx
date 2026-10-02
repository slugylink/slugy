import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/web/_sidebar/app-sidebar";
import { memo } from "react";
import SidebarHeader from "./_sidebar/sidebar-header";
import MaxWidthContainer from "../max-width-container";

export interface SharedLayoutProps {
  children: React.ReactNode;
  workspaceslug: string;
  className?: string;
  /** From the `sidebar_state` cookie, so the collapsed state survives reload. */
  defaultSidebarOpen?: boolean;
  workspaces?: {
    id: string;
    name: string;
    slug: string;
    userRole: "owner" | "admin" | "member" | null;
  }[];
}

export const SharedLayout = memo(function SharedLayout({
  children,
  workspaceslug,
  workspaces,
  className,
  defaultSidebarOpen = true,
}: SharedLayoutProps) {
  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AppSidebar
        workspaceslug={workspaceslug}
        workspaces={workspaces || []}
        className={className}
      />
      <SidebarInset>
        <MaxWidthContainer>
          <SidebarHeader />
          {/* No Suspense boundary here: each route owns its loading.tsx so the
              skeleton matches the page being loaded. A full-screen fallback in
              the shared layout would cover the sidebar and fight the route
              skeleton. */}
          <div className={`m-0 w-full p-0 ${className || ""}`.trim()}>
            {children}
          </div>
        </MaxWidthContainer>
      </SidebarInset>
    </SidebarProvider>
  );
});

SharedLayout.displayName = "SharedLayout";
