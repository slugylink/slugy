"use client";

import {
  ChevronRight,
  LinkIcon,
  BarChart2,
  Smartphone,
  Settings,
  SquareTerminal,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { memo, useMemo, useCallback } from "react";

type UserRole = "owner" | "admin" | "member" | null;

interface Brand {
  icon: LucideIcon;
  name: string;
}

interface NavSubItem {
  title: string;
  url: string;
}

interface NavItem {
  title: string;
  url?: string;
  icon?: LucideIcon;
  items?: NavSubItem[];
}

interface WorkspaceMinimal {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  userRole?: UserRole | null;
}

interface NavMainProps {
  workspaceslug?: string;
  workspaces: WorkspaceMinimal[];
}

const SIDEBAR_DATA: {
  logo: Brand;
  navMain: NavItem[];
} = {
  logo: {
    icon: SquareTerminal,
    name: "Slugy",
  },
  navMain: [
    { title: "Links", url: "/", icon: LinkIcon },
    { title: "Analytics", url: "/analytics", icon: BarChart2 },
    { title: "Bio Links", url: "/bio-links", icon: Smartphone },
    {
      title: "Settings",
      icon: Settings,
      items: [
        { title: "General", url: "/settings" },
        { title: "Billing", url: "/settings/billing" },
        { title: "Library", url: "/settings/library/tags" },
        { title: "Team", url: "/settings/team" },
      ],
    },
  ],
};

const NAV_ACCESS_CONTROL = {
  restrictedSubItems: {
    Billing: ["owner"] as const,
    "API key": ["owner", "admin"] as const,
    General: ["owner", "admin"] as const,
  },
} as const;

const hasAccess = (
  userRole: UserRole | null,
  allowedRoles: readonly string[],
): boolean => {
  return userRole ? allowedRoles.includes(userRole) : false;
};

const buildUrl = (baseUrl: string, path: string): string => {
  if (!baseUrl || path.startsWith(baseUrl + "/")) return path;
  return baseUrl + (path.startsWith("/") ? path : "/" + path);
};

const getLastPathSegment = (path: string): string => {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
};

export const NavMain = memo<NavMainProps>(function NavMain({
  workspaceslug,
  workspaces,
}) {
  const pathname = usePathname();

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.slug === workspaceslug),
    [workspaces, workspaceslug],
  );

  const userRole = currentWorkspace?.userRole ?? null;
  const baseUrl = workspaceslug ? `/${workspaceslug}` : "";

  const processedNavItems = useMemo(() => {
    return SIDEBAR_DATA.navMain.map((item) => {
      // For 'Bio Links', do not prepend baseUrl
      const isBioLinks = item.title === "Bio Links";
      const itemUrl = item.url
        ? isBioLinks
          ? item.url // Always '/bio-links'
          : buildUrl(baseUrl, item.url)
        : undefined;

      const filteredSubItems = item.items
        ?.filter((subItem: NavSubItem) => {
          const restrictedRoles =
            NAV_ACCESS_CONTROL.restrictedSubItems[
              subItem.title as keyof typeof NAV_ACCESS_CONTROL.restrictedSubItems
            ];
          return (
            !restrictedRoles ||
            userRole === null ||
            hasAccess(userRole, restrictedRoles)
          );
        })
        .map((subItem: NavSubItem) => ({
          ...subItem,
          url: isBioLinks
            ? subItem.url // If there are subitems for Bio Links, don't prepend baseUrl
            : buildUrl(baseUrl, subItem.url),
        }));

      return {
        ...item,
        url: itemUrl,
        items: filteredSubItems,
      };
    });
  }, [baseUrl, userRole]);

  const isItemActive = useCallback(
    (item: NavItem): boolean => {
      // Special case for Gallery
      if (item.title === "Gallery") {
        return pathname.includes("/bio-links");
      }

      // Check main item URL
      if (
        item.url &&
        getLastPathSegment(item.url) === getLastPathSegment(pathname)
      ) {
        return true;
      }

      // Check sub-items
      return (
        item.items?.some(
          (subItem) =>
            getLastPathSegment(subItem.url) === getLastPathSegment(pathname),
        ) ?? false
      );
    },
    [pathname],
  );

  const isSubItemActive = useCallback(
    (subItemUrl: string): boolean => {
      return getLastPathSegment(subItemUrl) === getLastPathSegment(pathname);
    },
    [pathname],
  );

  return (
    <SidebarGroup className="px-2">
      <SidebarMenu className="gap-2">
        {processedNavItems.map((item) => {
          const isActive = isItemActive(item);

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                {item.url ? (
                  <Link href={item.url}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={cn(
                        "group-hover/menu-item cursor-pointer transition-colors duration-200",
                        isActive &&
                          "bg-sidebar-accent text-blue-500 hover:text-blue-500",
                      )}
                    >
                      {item.icon && (
                        <item.icon className="size-4" strokeWidth={2} />
                      )}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </Link>
                ) : (
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={cn(
                        "group-hover/menu-item cursor-pointer transition-colors duration-200",
                        isActive &&
                          "bg-sidebar-accent text-blue-500 hover:text-blue-500",
                      )}
                    >
                      {item.icon && (
                        <item.icon className="size-4" strokeWidth={2} />
                      )}
                      <span
                        className={cn("font-normal", isActive && "font-medium")}
                      >
                        {item.title}
                      </span>
                      {item.items && (
                        <ChevronRight className="ml-auto size-4 transition-all duration-200 group-hover/menu-item:translate-x-0.5 group-data-[state=open]/collapsible:rotate-90" />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                )}

                {item.items && (
                  <CollapsibleContent>
                    <SidebarMenuSub className="mt-1">
                      {item.items.map((subItem: NavSubItem) => {
                        const subItemActive = isSubItemActive(subItem.url);

                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              className={cn(
                                "group-hover/menu-item transition-colors duration-200",
                                subItemActive &&
                                  "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                              )}
                            >
                              <Link href={subItem.url}>
                                <span
                                  className={cn(
                                    "font-normal",
                                    subItemActive && "font-medium",
                                  )}
                                >
                                  {subItem.title}
                                </span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
});
