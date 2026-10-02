"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getWorkspacePageTitle } from "@/constants/sidenav/workspace-nav";

export default function SidebarHeader() {
  const pathname = usePathname();
  const { state } = useSidebar();

  // Derive the workspace slug from the pathname: /{slug}[/...]. Deriving here
  // keeps the header decoupled from layout data while staying in sync with the
  // sidebar, since both read the same nav config.
  const slug = pathname.split("/").filter(Boolean)[0] ?? "";
  const pageTitle = getWorkspacePageTitle(pathname, slug);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center md:px-0">
        <SidebarTrigger className="block md:hidden" />
        <Separator
          orientation="vertical"
          className="mr-2 block h-4 md:hidden"
        />
        <h1 className="text-xl font-medium" aria-label="Page">
          {pageTitle}
        </h1>
      </div>
      {state === "collapsed" && (
        <span className="sr-only">Sidebar collapsed</span>
      )}
    </header>
  );
}
