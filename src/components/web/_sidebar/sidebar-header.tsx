"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

// Map last URL segments to human-friendly titles
const PAGE_TITLES: Record<string, string> = {
  analytics: "Analytics",
  "bio-links": "Bio Links",
  settings: "Settings",
  team: "Team",
  billing: "Billing",
  account: "Account",
  library: "Library",
  domains: "Domains",
};

function getPageTitle(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const lastPart = parts.at(-1) ?? "";
  const secondLastPart = parts.at(-2) ?? "";

  if (PAGE_TITLES[lastPart]) return PAGE_TITLES[lastPart];

  // Special handling when navigating deeper
  if (secondLastPart === "library") return "Library";
  if (secondLastPart === "bio-links") return "Bio Links";

  return ""; // Default fallback
}

export default function SidebarHeader() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center md:px-0">
        <SidebarTrigger className="block md:hidden" />
        <Separator
          orientation="vertical"
          className="mr-2 block h-4 md:hidden"
        />
        <div className="text-xl font-medium">{pageTitle}</div>
      </div>
    </header>
  );
}
