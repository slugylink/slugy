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
import { memo, useMemo, useRef, useEffect } from "react";

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

// Optimized sidebar data with precomputed paths
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

// Optimized access control check
const hasAccess = (
  userRole: UserRole | null,
  allowedRoles: readonly string[],
): boolean => {
  return userRole ? allowedRoles.includes(userRole) : false;
};

// Optimized URL building with caching
const buildUrl = (baseUrl: string, path: string): string => {
  if (!baseUrl || path.startsWith(baseUrl + "/")) return path;
  return baseUrl + (path.startsWith("/") ? path : "/" + path);
};

// Fast path segment extraction with caching
const pathSegmentCache = new Map<string, string>();

// Optimized active state checking
const createActiveStateChecker = (pathname: string) => {
  const pathSegments = pathname.split("/").filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1] ?? "";

  return {
    isItemActive: (item: NavItem): boolean => {
      // Special case for Bio Links
      if (item.title === "Bio Links") {
        return pathname.includes("/bio-links");
      }

      // Check main item URL
      if (item.url) {
        const itemSegments = item.url.split("/").filter(Boolean);
        const itemLastSegment = itemSegments[itemSegments.length - 1] ?? "";
        if (itemLastSegment === lastSegment) return true;
      }

      // Check sub-items
      return (
        item.items?.some((subItem) => {
          const subSegments = subItem.url.split("/").filter(Boolean);
          const subLastSegment = subSegments[subSegments.length - 1] ?? "";
          return subLastSegment === lastSegment;
        }) ?? false
      );
    },

    isSubItemActive: (subItemUrl: string): boolean => {
      const subSegments = subItemUrl.split("/").filter(Boolean);
      const subLastSegment = subSegments[subSegments.length - 1] ?? "";
      return subLastSegment === lastSegment;
    },
  };
};

// Optimized NavItem component with memoization
const NavItemComponent = memo<{
  item: NavItem;
  isActive: boolean;
  isSubItemActive: (url: string) => boolean;
}>(({ item, isActive, isSubItemActive }) => {
  return (
    <Collapsible
      key={item.title}
      asChild
      defaultOpen={isActive}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        {item.url ? (
          <Link href={item.url} prefetch={true}>
            <SidebarMenuButton
              tooltip={item.title}
              className={cn(
                "group-hover/menu-item cursor-pointer transition-colors duration-200",
                isActive &&
                  "bg-sidebar-accent text-blue-500 hover:text-blue-500",
              )}
            >
              {item.icon && <item.icon className="size-4" strokeWidth={2} />}
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
              {item.icon && <item.icon className="size-4" strokeWidth={2} />}
              <span className={cn("font-normal", isActive && "font-medium")}>
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
                      <Link href={subItem.url} prefetch={true}>
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
});

NavItemComponent.displayName = "NavItemComponent";

export const NavMain = memo<NavMainProps>(function NavMain({
  workspaceslug,
  workspaces,
}) {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  // Optimize workspace lookup
  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.slug === workspaceslug),
    [workspaces, workspaceslug],
  );

  const userRole = currentWorkspace?.userRole ?? null;
  const baseUrl = workspaceslug ? `/${workspaceslug}` : "";

  // Optimized nav items processing with better memoization
  const processedNavItems = useMemo(() => {
    return SIDEBAR_DATA.navMain.map((item) => {
      const isBioLinks = item.title === "Bio Links";
      const itemUrl = item.url
        ? isBioLinks
          ? item.url
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
          url: isBioLinks ? subItem.url : buildUrl(baseUrl, subItem.url),
        }));

      return {
        ...item,
        url: itemUrl,
        items: filteredSubItems,
      };
    });
  }, [baseUrl, userRole]);

  // Optimized active state checker
  const activeStateChecker = useMemo(
    () => createActiveStateChecker(pathname),
    [pathname],
  );

  // Prefetch optimization - prefetch all nav items on mount
  useEffect(() => {
    const prefetchUrls = processedNavItems
      .filter((item) => item.url)
      .map((item) => item.url!)
      .concat(
        processedNavItems
          .flatMap((item) => item.items || [])
          .map((subItem) => subItem.url),
      );

    // Prefetch all navigation URLs
    prefetchUrls.forEach((url) => {
      if (url && !url.startsWith("http")) {
        // Use Next.js router prefetch if available
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = url;
        document.head.appendChild(link);
      }
    });
  }, [processedNavItems]);

  // Clear path cache when pathname changes significantly
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      // Clear cache only when pathname changes significantly
      if (pathname.split("/")[1] !== prevPathnameRef.current.split("/")[1]) {
        pathSegmentCache.clear();
      }
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  return (
    <SidebarGroup className="px-2">
      <SidebarMenu className="gap-2">
        {processedNavItems.map((item) => {
          const isActive = activeStateChecker.isItemActive(item);

          return (
            <NavItemComponent
              key={item.title}
              item={item}
              isActive={isActive}
              isSubItemActive={activeStateChecker.isSubItemActive}
            />
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
});
