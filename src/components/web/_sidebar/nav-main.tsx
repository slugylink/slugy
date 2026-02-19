"use client";

import {
  ChevronRight,
  BarChart2,
  SquareTerminal,
  type LucideIcon,
  Globe,
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
import { useSidebar } from "@/components/ui/sidebar";
import { LinkIcon } from "@/utils/icons/link";
import { PhoneIcon } from "@/utils/icons/phone";
import { SettingsIcon } from "@/utils/icons/settings";

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Constants
// ============================================================================

const SIDEBAR_DATA = {
  logo: { icon: SquareTerminal, name: "Slugy" } as Brand,
  navMain: [
    { title: "Links", url: "/", icon: LinkIcon },
    { title: "Analytics", url: "/analytics", icon: BarChart2 },
    { title: "Domains", url: "/domains", icon: Globe },
    { title: "Bio Links", url: "/bio-links", icon: PhoneIcon },
    {
      title: "Settings",
      icon: SettingsIcon,
      items: [
        { title: "General", url: "/settings" },
        { title: "Billing", url: "/settings/billing" },
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

const PREFETCH_ROUTES = ["/", "/analytics", "/bio-links"];

// ============================================================================
// Utilities
// ============================================================================

function hasAccess(
  userRole: UserRole,
  allowedRoles: readonly string[],
): boolean {
  return Boolean(userRole && allowedRoles.includes(userRole));
}

function buildUrl(baseUrl: string, path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (!baseUrl || path.startsWith(baseUrl)) return path;
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function getLastSegment(url: string): string {
  const segments = url.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

function shouldPrefetch(url: string): boolean {
  return PREFETCH_ROUTES.some((route) => url === route || url.includes(route));
}

// ============================================================================
// Sub-Components
// ============================================================================

const SubItemComponent = memo<{
  subItem: NavSubItem;
  isActive: boolean;
  onClick?: () => void;
}>(({ subItem, isActive, onClick }) => {
  return (
    <SidebarMenuSubItem key={subItem.title}>
      <SidebarMenuSubButton
        asChild
        className={cn(
          "group-hover/menu-item transition-colors duration-200",
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
        )}
      >
        <Link href={subItem.url} prefetch={false} onClick={onClick}>
          <span className={cn("font-normal")}>{subItem.title}</span>
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
});
SubItemComponent.displayName = "SubItemComponent";

const SubItemsList = memo<{
  items: NavSubItem[];
  isSubItemActive: (subUrl: string) => boolean;
  onClick?: () => void;
}>(({ items, isSubItemActive, onClick }) => {
  return items.map((subItem) => (
    <SubItemComponent
      key={subItem.title}
      subItem={subItem}
      isActive={isSubItemActive(subItem.url)}
      onClick={onClick}
    />
  ));
});
SubItemsList.displayName = "SubItemsList";

const NavItemComponent = memo<{
  item: NavItem;
  isActive: boolean;
  isSubItemActive: (subUrl: string) => boolean;
  onNavItemClick?: () => void;
}>(({ item, isActive, isSubItemActive, onNavItemClick }) => {
  const buttonClasses = cn(
    "group-hover/menu-item cursor-pointer transition-colors duration-200",
    isActive && "bg-sidebar-accent text-blue-500 hover:text-blue-500",
  );

  return (
    <Collapsible
      key={item.title}
      asChild
      defaultOpen={isActive}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        {item.url ? (
          <Link
            href={item.url}
            prefetch={shouldPrefetch(item.url)}
            onClick={onNavItemClick}
          >
            <SidebarMenuButton tooltip={item.title} className={buttonClasses}>
              {item.icon && <item.icon className="size-4" strokeWidth={2} />}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </Link>
        ) : (
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.title} className={buttonClasses}>
              {item.icon && <item.icon className="size-4" strokeWidth={2} />}
              <span className={cn("font-normal")}>{item.title}</span>
              {item.items && (
                <ChevronRight className="ml-auto size-4 transition-all duration-200 group-hover/menu-item:translate-x-0.5 group-data-[state=open]/collapsible:rotate-90" />
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
        )}

        {item.items && (
          <CollapsibleContent className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 overflow-hidden duration-200 ease-out">
            <SidebarMenuSub className="mt-1">
              <SubItemsList
                items={item.items}
                isSubItemActive={isSubItemActive}
                onClick={onNavItemClick}
              />
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
});
NavItemComponent.displayName = "NavItemComponent";

// ============================================================================
// Main Component
// ============================================================================

export const NavMain = memo<NavMainProps>(({ workspaceslug, workspaces }) => {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  // Derive workspace context
  const { userRole, baseUrl } = useMemo(() => {
    const currentWorkspace = workspaces.find((w) => w.slug === workspaceslug);
    return {
      userRole: currentWorkspace?.userRole ?? null,
      baseUrl: workspaceslug ? `/${workspaceslug}` : "",
    };
  }, [workspaces, workspaceslug]);

  // Process navigation items with access control and URL building
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

  // Memoize last segment for active state checks
  const lastSegment = useMemo(() => getLastSegment(pathname), [pathname]);

  // Check if nav item is active
  const isItemActive = useCallback(
    (item: NavItem): boolean => {
      if (item.title === "Bio Links") {
        return pathname.includes("/bio-links");
      }
      if (item.url && getLastSegment(item.url) === lastSegment) {
        return true;
      }
      return (
        item.items?.some((sub) => getLastSegment(sub.url) === lastSegment) ??
        false
      );
    },
    [pathname, lastSegment],
  );

  // Check if sub-item is active
  const isSubItemActive = useCallback(
    (subUrl: string): boolean => getLastSegment(subUrl) === lastSegment,
    [lastSegment],
  );

  // Handle navigation click (close mobile sidebar)
  const handleNavItemClick = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  return (
    <SidebarGroup className="px-2">
      <SidebarMenu className="gap-2">
        {processedNavItems.map((item) => (
          <NavItemComponent
            key={item.title}
            item={item}
            isActive={isItemActive(item)}
            isSubItemActive={isSubItemActive}
            onNavItemClick={handleNavItemClick}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
});
NavMain.displayName = "NavMain";
