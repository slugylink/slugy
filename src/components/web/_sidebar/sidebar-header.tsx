"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function SidebarHeader() {
  const pathname = usePathname();

  // Extract the relevant part of the pathname
  const getPageTitle = () => {
    const parts = pathname.split("/");
    const lastPart = parts[parts.length - 1];

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
        if (parts[parts.length - 2] === "library") {
          return "Library";
        }
        if (parts[parts.length - 2] === "bio-links") {
          return "Bio Links";
        }
        return "Links";
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center md:px-0">
        <SidebarTrigger className="block md:hidden" />
        <Separator
          orientation="vertical"
          className="mr-2 block h-4 md:hidden"
        />
        <div className="text-xl font-medium">{getPageTitle()}</div>
      </div>
    </header>
  );
}
