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

// --------------------------
// Types
// --------------------------
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

// --------------------------
// Static Data
// --------------------------
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

const NAV_ACCESS_CONTROL = {
  restrictedSubItems: {
    Billing: ["owner"] as const,
    "API key": ["owner", "admin"] as const,
    General: ["owner", "admin"] as const,
  },
} as const;

// --------------------------
// Helpers
// --------------------------
const hasAccess = (userRole: UserRole, allowedRoles: readonly string[]) =>
  Boolean(userRole && allowedRoles.includes(userRole));

const buildUrl = (baseUrl: string, path: string): string => {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return baseUrl && !path.startsWith(baseUrl)
    ? `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`
    : path;
};

const getLastSegment = (url: string) =>
  url.split("/").filter(Boolean).at(-1) ?? "";

// --------------------------
// Nav Item Component
// --------------------------
const NavItemComponent = memo<{
  item: NavItem;
  isActive: boolean;
  renderSubItems: (items: NavSubItem[]) => React.ReactNode;
}>(({ item, isActive, renderSubItems }) => {
  return (
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
                  "bg-sidebar-accent text-blue-500 hover:text-blue-500 font-medium",
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
              {renderSubItems(item.items)}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
});
NavItemComponent.displayName = "NavItemComponent";

// --------------------------
// Sub Item Component
// --------------------------
const SubItemComponent = memo<{
  subItem: NavSubItem;
  isActive: boolean;
}>(({ subItem, isActive }) => (
  <SidebarMenuSubItem key={subItem.title}>
    <SidebarMenuSubButton
      asChild
      className={cn(
        "group-hover/menu-item transition-colors duration-200",
        isActive &&
          "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
      )}
    >
      <Link href={subItem.url} prefetch>
        <span className={cn("font-normal", isActive && "font-medium")}>
          {subItem.title}
        </span>
      </Link>
    </SidebarMenuSubButton>
  </SidebarMenuSubItem>
));
SubItemComponent.displayName = "SubItemComponent";

// --------------------------
// Main Sidebar Nav
// --------------------------
export const NavMain = memo<NavMainProps>(function NavMain({
  workspaceslug,
  workspaces,
}) {
  const pathname = usePathname();

  // Memoize workspace and user role lookup
  const { userRole, baseUrl } = useMemo(() => {
    const currentWorkspace = workspaces.find((w) => w.slug === workspaceslug);
    const userRole = currentWorkspace?.userRole ?? null;
    const baseUrl = workspaceslug ? `/${workspaceslug}` : "";
    return { currentWorkspace, userRole, baseUrl };
  }, [workspaces, workspaceslug]);

  // Memoize processed nav items with access control
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
          return allowedRoles ? hasAccess(userRole, allowedRoles) : true;
        })
        .map((sub) => ({
          ...sub,
          url: isBioLinks ? sub.url : buildUrl(baseUrl, sub.url),
        }));

      return { ...item, url: itemUrl, items: filteredSubItems };
    });
  }, [baseUrl, userRole]);

  // Memoize active state checker
  const activeStateChecker = useMemo(() => {
    const lastSegment = getLastSegment(pathname);

    return {
      isItemActive: (item: NavItem): boolean => {
        if (item.title === "Bio Links") return pathname.includes("/bio-links");
        if (item.url && getLastSegment(item.url) === lastSegment) return true;
        return (
          item.items?.some((sub) => getLastSegment(sub.url) === lastSegment) ??
          false
        );
      },
      isSubItemActive: (subUrl: string): boolean =>
        getLastSegment(subUrl) === lastSegment,
    };
  }, [pathname]);

  // Memoize sub-item renderer
  const renderSubItems = useCallback(
    (items: NavSubItem[]) =>
      items.map((subItem) => (
        <SubItemComponent
          key={subItem.title}
          subItem={subItem}
          isActive={activeStateChecker.isSubItemActive(subItem.url)}
        />
      )),
    [activeStateChecker],
  );

  // Memoize prefetch links for analytics and bio pages
  const prefetchLinks = useMemo(() => {
    const links = [];

    // Always prefetch analytics page
    if (baseUrl) {
      links.push(`${baseUrl}/analytics`);
    }

    // Always prefetch bio-links page (it's a global route)
    links.push("/bio-links");

    // Prefetch other non-settings, non-external routes
    processedNavItems.forEach(({ url, title }) => {
      if (url && title !== "Settings" && !/^https?:\/\//.test(url)) {
        links.push(url);
      }
    });

    return links;
  }, [baseUrl, processedNavItems]);

  // Prefetch important pages
  useMemo(() => {
    prefetchLinks.forEach((url) => {
      if (typeof window !== "undefined") {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = url;
        document.head.appendChild(link);

        // Cleanup after a delay to avoid memory leaks
        setTimeout(() => {
          if (document.head.contains(link)) {
            document.head.removeChild(link);
          }
        }, 5000);
      }
    });
  }, [prefetchLinks]);

  return (
    <SidebarGroup className="px-2">
      <SidebarMenu className="gap-2">
        {processedNavItems.map((item) => (
          <NavItemComponent
            key={item.title}
            item={item}
            isActive={activeStateChecker.isItemActive(item)}
            renderSubItems={renderSubItems}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
});
