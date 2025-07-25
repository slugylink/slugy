"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useMemo } from "react";

export default function SidebarHeader() {
  const pathname = usePathname() ?? "/";

  const getPageTitle = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean); // remove empty segments
    const lastPart = parts[parts.length - 1] ?? "";
    const secondLastPart = parts.length > 1 ? parts[parts.length - 2] : "";

    switch (lastPart) {
      case "analytics":
        return "Analytics";
      case "bio-links":
        return "Bio Links";
      case "settings":
        return "Settings";
      case "team":
        return "Team";
      case "billing":
        return "Plan and Usage";
      case "account":
        return "Account";
      case "library":
        return "Library";
      default:
        if (secondLastPart === "library") {
          return "Library";
        }
        if (secondLastPart === "bio-links") {
          return "Bio Links";
        }
        return "Links";
    }
  }, [pathname]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center md:px-0">
        <SidebarTrigger className="block md:hidden" />
        <Separator
          orientation="vertical"
          className="mr-2 block h-4 md:hidden"
        />
        <div className="text-xl font-medium">{getPageTitle}</div>
      </div>
    </header>
  );
}
