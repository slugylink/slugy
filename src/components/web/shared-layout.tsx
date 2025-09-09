import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/web/_sidebar/app-sidebar";
import { Suspense, memo, useMemo } from "react";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import SidebarHeader from "./_sidebar/sidebar-header";
import MaxWidthContainer from "../max-width-container";

interface SharedLayoutProps {
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
      <LoaderCircle className="h-8 w-8 animate-spin" />
      <p className="text-sm text-muted-foreground">Loading workspace...</p>
    </div>
  </div>
));

LayoutSkeleton.displayName = "LayoutSkeleton";

// Memoize the SharedLayout component with optimized props
export const SharedLayout = memo(function SharedLayout({
  children,
  workspaceslug,
  workspaces,
  className,
}: SharedLayoutProps) {
  // Memoize sidebar props to prevent unnecessary re-renders
  const sidebarProps = useMemo(
    () => ({
      workspaceslug,
      workspaces: workspaces || [],
      className,
    }),
    [workspaceslug, workspaces, className],
  );

  // Memoize container className
  const containerClassName = useMemo(
    () => `m-0 w-full p-0 ${className || ""}`.trim(),
    [className],
  );

  return (
    <SidebarProvider>
      <AppSidebar {...sidebarProps} />
      <SidebarInset>
        <MaxWidthContainer>
          <SidebarHeader />
          <Suspense fallback={<LayoutSkeleton />}>
            <div className={containerClassName}>{children}</div>
          </Suspense>
        </MaxWidthContainer>
      </SidebarInset>
    </SidebarProvider>
  );
});

SharedLayout.displayName = "SharedLayout";
