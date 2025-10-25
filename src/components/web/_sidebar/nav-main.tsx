"use client";

import {
  ChevronRight,
  LinkIcon,
  BarChart2,
  Smartphone,
  Settings,
  SquareTerminal,
  type LucideIcon,
  Globe,
  Folder,
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
import { memo, useMemo, useCallback, useEffect, useRef } from "react";
import { useSidebar } from "@/components/ui/sidebar";

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
    { title: "Bio Links", url: "/bio-links", icon: Smartphone },
    { title: "Domains", url: "/settings/domains", icon: Globe },
    {
      title: "Settings",
      icon: Settings,
      items: [
        { title: "General", url: "/settings" },
        { title: "Library", url: "/settings/library/tags", icon: Folder },
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

// Core pages to prefetch
const CORE_PAGES = ["/", "/analytics", "/bio-links"] as const;

// Prefetch configuration
const PREFETCH_CONFIG = {
  corePages: CORE_PAGES,
  delay: 100, // ms delay before prefetching
  maxConcurrent: 3, // max concurrent prefetch requests
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
  if (/^https?:\/\//.test(path)) return path;
  return baseUrl && !path.startsWith(baseUrl)
    ? `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`
    : path;
};

const getLastSegment = (url: string): string =>
  url.split("/").filter(Boolean).at(-1) ?? "";

// Prefetch utility with better error handling
const prefetchPage = (url: string): Promise<void> => {
  return new Promise((resolve) => {
    // Check if already prefetched
    if (document.querySelector(`link[rel="prefetch"][href="${url}"]`)) {
      resolve();
      return;
    }

    try {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = url;

      link.onload = () => resolve();
      link.onerror = () => resolve(); // Don't fail on error

      document.head.appendChild(link);
    } catch (error) {
      console.warn(`Failed to prefetch ${url}:`, error);
      resolve(); // Don't fail on error
    }
  });
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
  // Memoize the chevron icon to prevent unnecessary re-renders
  const chevronIcon = useMemo(
    () => (
      <ChevronRight className="ml-auto size-4 transition-all duration-200 group-hover/menu-item:translate-x-0.5 group-data-[state=open]/collapsible:rotate-90" />
    ),
    [],
  );

  // Memoize the item icon to prevent unnecessary re-renders
  const itemIcon = useMemo(
    () => item.icon && <item.icon className="size-4" strokeWidth={2} />,
    [item.icon],
  );

  const baseButtonClasses = useMemo(
    () =>
      cn(
        "group-hover/menu-item cursor-pointer transition-colors duration-200",
        isActive && "bg-sidebar-accent text-blue-500 hover:text-blue-500",
      ),
    [isActive],
  );

  const titleClasses = useMemo(
    () => cn("font-normal", isActive && "font-medium"),
    [isActive],
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
  const buttonClasses = useMemo(
    () =>
      cn(
        "group-hover/menu-item transition-colors duration-200",
        isActive &&
          "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
      ),
    [isActive],
  );

  const titleClasses = useMemo(
    () => cn("font-normal", isActive && "font-medium"),
    [isActive],
  );

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
  const prefetchRef = useRef<Set<string>>(new Set());
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
          // Bio-links is active when pathname includes /bio-links, regardless of workspace
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

  useEffect(() => {
    const prefetchCorePages = async () => {
      try {
        await new Promise((resolve) =>
          setTimeout(resolve, PREFETCH_CONFIG.delay),
        );

        for (const page of PREFETCH_CONFIG.corePages) {
          // Bio-links should always be prefetched at root level
          const fullUrl =
            page === "/bio-links" ? page : baseUrl ? `${baseUrl}${page}` : page;

          if (!prefetchRef.current.has(fullUrl)) {
            prefetchRef.current.add(fullUrl);
            await prefetchPage(fullUrl);
          }
        }
      } catch (error) {
        console.warn("Failed to prefetch core pages:", error);
      }
    };

    prefetchCorePages();
  }, [baseUrl]);

  // Prefetch other nav items with better performance
  useEffect(() => {
    const prefetchNavItems = async () => {
      try {
        // Prefetch with delay and concurrency control
        await new Promise((resolve) =>
          setTimeout(resolve, PREFETCH_CONFIG.delay * 2),
        );

        const urlsToPrefetch = processedNavItems
          .filter(
            ({ url, title }) =>
              url &&
              title !== "Settings" &&
              !/^https?:\/\//.test(url) &&
              !PREFETCH_CONFIG.corePages.some((page) => url.endsWith(page)) &&
              !prefetchRef.current.has(url),
          )
          .map((item) => item.url!)
          .slice(0, PREFETCH_CONFIG.maxConcurrent);

        // Prefetch in parallel with concurrency limit
        const prefetchPromises = urlsToPrefetch.map(async (url) => {
          if (!prefetchRef.current.has(url)) {
            prefetchRef.current.add(url);
            await prefetchPage(url);
          }
        });

        await Promise.allSettled(prefetchPromises);
      } catch (error) {
        console.warn("Failed to prefetch nav items:", error);
      }
    };

    prefetchNavItems();
  }, [processedNavItems]);

  // Cleanup prefetch tracking on unmount
  useEffect(() => {
    return () => {
      prefetchRef.current.clear();
    };
  }, []);

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
