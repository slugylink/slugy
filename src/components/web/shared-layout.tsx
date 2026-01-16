import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/web/_sidebar/app-sidebar";
import { Suspense, memo } from "react";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import SidebarHeader from "./_sidebar/sidebar-header";
import MaxWidthContainer from "../max-width-container";

export interface SharedLayoutProps {
  children: React.ReactNode;
  workspaceslug: string;
  className?: string;
  workspaces?: {
    id: string;
    name: string;
    slug: string;
    userRole: "owner" | "admin" | "member" | null;
  }[];
}

// Optimized loading skeleton with better UX
const LayoutSkeleton = memo(() => (
  <div className="flex h-screen items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  </div>
));

LayoutSkeleton.displayName = "LayoutSkeleton";

export const SharedLayout = memo(function SharedLayout({
  children,
  workspaceslug,
  workspaces,
  className,
}: SharedLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        workspaceslug={workspaceslug}
        workspaces={workspaces || []}
        className={className}
      />
      <SidebarInset>
        <MaxWidthContainer>
          <SidebarHeader />
          <Suspense fallback={<LayoutSkeleton />}>
            <div className={`m-0 w-full p-0 ${className || ""}`.trim()}>
              {children}
            </div>
          </Suspense>
        </MaxWidthContainer>
      </SidebarInset>
    </SidebarProvider>
  );
});

SharedLayout.displayName = "SharedLayout";
