import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/web/_sidebar/app-sidebar";
import { Suspense, memo } from "react";
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

// Memoize the SharedLayout component
export const SharedLayout = memo(function SharedLayout({
  children,
  workspaceslug,
  workspaces,
  className,
}: SharedLayoutProps) {
  // Memoize the AppSidebar props
  const sidebarProps = {
    workspaceslug: workspaceslug,
    workspaces: workspaces || [],
    className,
  };

  return (
    <SidebarProvider>
      <AppSidebar {...sidebarProps} />
      <SidebarInset>
        <MaxWidthContainer>
          <SidebarHeader />
          <Suspense fallback={<LoaderCircle className="h-4 w-4" />}>
            <div className="m-0 w-full p-0">{children}</div>
          </Suspense>
        </MaxWidthContainer>
      </SidebarInset>
    </SidebarProvider>
  );
});
