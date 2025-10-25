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
// Constants
// --------------------------
const SIDEBAR_DATA = {
  logo: { icon: SquareTerminal, name: "Slugy" } as Brand,
  navMain: [
    { title: "Links", url: "/", icon: LinkIcon },
    { title: "Analytics", url: "/analytics", icon: BarChart2 },
    { title: "Bio Links", url: "/bio-links", icon: PhoneIcon },
    { title: "Domains", url: "/settings/domains", icon: Globe },
    {
      title: "Settings",
      icon: SettingsIcon,
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
const hasAccess = (
  userRole: UserRole,
  allowedRoles: readonly string[],
): boolean => Boolean(userRole && allowedRoles.includes(userRole));

const buildUrl = (baseUrl: string, path: string): string => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return baseUrl && !path.startsWith(baseUrl)
    ? `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`
    : path;
};

const getLastSegment = (url: string): string => {
  const segments = url.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
};

// --------------------------
// Nav Item Component
// --------------------------
const NavItemComponent = memo<{
  item: NavItem;
  isActive: boolean;
  renderSubItems: (items: NavSubItem[]) => React.ReactNode;
  onNavItemClick?: () => void;
}>(({ item, isActive, renderSubItems, onNavItemClick }) => {
  const chevronIcon = (
    <ChevronRight className="ml-auto size-4 transition-all duration-200 group-hover/menu-item:translate-x-0.5 group-data-[state=open]/collapsible:rotate-90" />
  );

  const itemIcon = item.icon && (
    <item.icon className="size-4" strokeWidth={2} />
  );

  const baseButtonClasses = cn(
    "group-hover/menu-item cursor-pointer transition-colors duration-200",
    isActive && "bg-sidebar-accent text-blue-500 hover:text-blue-500",
  );

  const titleClasses = cn("font-normal", isActive && "font-medium");

  return (
    <Collapsible
      key={item.title}
      asChild
      defaultOpen={isActive}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        {item.url ? (
          <Link href={item.url} prefetch onClick={onNavItemClick}>
            <SidebarMenuButton
              tooltip={item.title}
              className={baseButtonClasses}
            >
              {itemIcon}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </Link>
        ) : (
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={item.title}
              className={baseButtonClasses}
            >
              {itemIcon}
              <span className={titleClasses}>{item.title}</span>
              {item.items && chevronIcon}
            </SidebarMenuButton>
          </CollapsibleTrigger>
        )}

        {item.items && (
          <CollapsibleContent className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 overflow-hidden duration-200 ease-out">
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
  onClick?: () => void;
}>(({ subItem, isActive, onClick }) => {
  const buttonClasses = cn(
    "group-hover/menu-item transition-colors duration-200",
    isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
  );

  const titleClasses = cn("font-normal", isActive && "font-medium");

  return (
    <SidebarMenuSubItem key={subItem.title}>
      <SidebarMenuSubButton asChild className={buttonClasses}>
        <Link href={subItem.url} prefetch onClick={onClick}>
          <span className={titleClasses}>{subItem.title}</span>
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
});
SubItemComponent.displayName = "SubItemComponent";

// --------------------------
// Main Sidebar Nav
// --------------------------
export const NavMain = memo<NavMainProps>(function NavMain({
  workspaceslug,
  workspaces,
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  // Workspace & role with better memoization
  const { userRole, baseUrl } = useMemo(() => {
    const currentWorkspace = workspaces.find((w) => w.slug === workspaceslug);
    const userRole = currentWorkspace?.userRole ?? null;
    const baseUrl = workspaceslug ? `/${workspaceslug}` : "";
    return { userRole, baseUrl };
  }, [workspaces, workspaceslug]);

  // Processed nav items with better performance
  const processedNavItems = useMemo(() => {
    return SIDEBAR_DATA.navMain.map((item) => {
      const isBioLinks = item.title === "Bio Links";
      const itemUrl = item.url
        ? isBioLinks
          ? item.url // Bio-links always uses root path, independent of workspace
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

  // Active checker with better performance
  const activeStateChecker = useMemo(() => {
    const lastSegment = getLastSegment(pathname);

    return {
      isItemActive: (item: NavItem): boolean => {
        if (item.title === "Bio Links") {
          return pathname.includes("/bio-links");
        }
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

  // Handle navigation item click - close mobile sidebar
  const handleNavItemClick = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  // Sub-item renderer with better memoization
  const renderSubItems = useCallback(
    (items: NavSubItem[]) =>
      items.map((subItem) => (
        <SubItemComponent
          key={subItem.title}
          subItem={subItem}
          isActive={activeStateChecker.isSubItemActive(subItem.url)}
          onClick={handleNavItemClick}
        />
      )),
    [activeStateChecker, handleNavItemClick],
  );

  return (
    <SidebarGroup className="px-2">
      <SidebarMenu className="gap-2">
        {processedNavItems.map((item) => (
          <NavItemComponent
            key={item.title}
            item={item}
            isActive={activeStateChecker.isItemActive(item)}
            renderSubItems={renderSubItems}
            onNavItemClick={handleNavItemClick}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
});
