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

// Cache to store path segments — cleared on pathname changes
const pathSegmentCache = new Map<string, string>();

// Sidebar static data
const SIDEBAR_DATA = {
  logo: { icon: SquareTerminal, name: "Slugy" } as Brand,
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
  ] as NavItem[],
};

// Access control config
const NAV_ACCESS_CONTROL = {
  restrictedSubItems: {
    Billing: ["owner"] as const,
    "API key": ["owner", "admin"] as const,
    General: ["owner", "admin"] as const,
  },
} as const;

// Access check helper
const hasAccess = (
  userRole: UserRole | null,
  allowedRoles: readonly string[],
) => userRole !== null && allowedRoles.includes(userRole);

// URL prefixer with absolute URL detection
const buildUrl = (baseUrl: string, path: string): string => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return baseUrl && !path.startsWith(baseUrl)
    ? baseUrl + (path.startsWith("/") ? path : `/${path}`)
    : path;
};

// Active state checker factory
const createActiveStateChecker = (pathname: string) => {
  const pathSegments = pathname.split("/").filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1] ?? "";

  return {
    isItemActive: (item: NavItem): boolean => {
      if (item.title === "Bio Links") {
        return pathname.includes("/bio-links");
      }
      if (item.url) {
        const segments = item.url.split("/").filter(Boolean);
        if (segments[segments.length - 1] === lastSegment) return true;
      }
      return (
        item.items?.some((sub) => {
          const seg = sub.url.split("/").filter(Boolean);
          return seg[seg.length - 1] === lastSegment;
        }) ?? false
      );
    },

    isSubItemActive: (subUrl: string) => {
      const seg = subUrl.split("/").filter(Boolean);
      return seg[seg.length - 1] === lastSegment;
    },
  };
};

const NavItemComponent = memo<{
  item: NavItem;
  isActive: boolean;
  isSubItemActive: (url: string) => boolean;
}>(({ item, isActive, isSubItemActive }) => (
  <Collapsible
    key={item.title}
    asChild
    defaultOpen={isActive}
    className="group/collapsible"
  >
    <SidebarMenuItem>
      {item.url ? (
        <Link href={item.url} prefetch>
          <SidebarMenuButton
            tooltip={item.title}
            className={cn(
              "group-hover/menu-item cursor-pointer transition-colors duration-200",
              isActive && "bg-sidebar-accent text-blue-500 hover:text-blue-500",
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
              isActive && "bg-sidebar-accent text-blue-500 hover:text-blue-500",
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
            {item.items.map((subItem) => {
              const active = isSubItemActive(subItem.url);
              return (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton
                    asChild
                    className={cn(
                      "group-hover/menu-item transition-colors duration-200",
                      active &&
                        "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                    )}
                  >
                    <Link href={subItem.url} prefetch>
                      <span
                        className={cn("font-normal", active && "font-medium")}
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
));

NavItemComponent.displayName = "NavItemComponent";

export const NavMain = memo<NavMainProps>(function NavMain({
  workspaceslug,
  workspaces,
}) {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.slug === workspaceslug),
    [workspaces, workspaceslug],
  );

  const userRole = currentWorkspace?.userRole ?? null;
  const baseUrl = workspaceslug ? `/${workspaceslug}` : "";

  const processedNavItems = useMemo(() => {
    return SIDEBAR_DATA.navMain.map((item) => {
      const isBioLinks = item.title === "Bio Links";
      const itemUrl = item.url
        ? isBioLinks
          ? item.url
          : buildUrl(baseUrl, item.url)
        : undefined;

      const filteredSubItems = item.items
        ?.filter((sub) => {
          const allowedRoles =
            NAV_ACCESS_CONTROL.restrictedSubItems[
              sub.title as keyof typeof NAV_ACCESS_CONTROL.restrictedSubItems
            ];
          if (!allowedRoles) return true;
          if (!userRole) return false;
          return hasAccess(userRole, allowedRoles);
        })
        .map((sub) => ({
          ...sub,
          url: isBioLinks ? sub.url : buildUrl(baseUrl, sub.url),
        }));

      return {
        ...item,
        url: itemUrl,
        items: filteredSubItems,
      };
    });
  }, [baseUrl, userRole]);

  const activeStateChecker = useMemo(
    () => createActiveStateChecker(pathname),
    [pathname],
  );

  useEffect(() => {
    processedNavItems.forEach(({ url, title }) => {
      if (url && title !== "Settings" && !url.startsWith("http")) {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = url;
        document.head.appendChild(link);
      }
    });
  }, [processedNavItems]);

  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      if (pathname.split("/")[1] !== prevPathnameRef.current.split("/")[1]) {
        pathSegmentCache.clear();
      }
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  return (
    <SidebarGroup className="px-2">
      <SidebarMenu className="gap-2">
        {processedNavItems.map((item) => (
          <NavItemComponent
            key={item.title}
            item={item}
            isActive={activeStateChecker.isItemActive(item)}
            isSubItemActive={activeStateChecker.isSubItemActive}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
});
