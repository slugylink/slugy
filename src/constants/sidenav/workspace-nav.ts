import type { ComponentType } from "react";
import { BarChart2, Globe, DiamondPlus, Tag } from "lucide-react";
import { LinkIcon } from "@/utils/icons/link";
import { PhoneIcon } from "@/utils/icons/phone";
import { SettingsIcon } from "@/utils/icons/settings";

// ============================================================================
// Shared workspace navigation config
//
// Single source of truth for BOTH the sidebar (nav-main.tsx) and the page
// header title (sidebar-header.tsx). Keeping them together means a new route
// gets the right sidebar entry and the right header title in one edit.
// All item URLs are relative to the workspace root; Bio Links is absolute.
// ============================================================================

export type WorkspaceUserRole = "owner" | "admin" | "member" | null;

/** Accepts both lucide icons and the project's custom SVG icon components. */
export type NavIcon = ComponentType<{
  className?: string;
  strokeWidth?: number;
}>;

export interface NavSubItem {
  title: string;
  url: string;
}

export interface NavItem {
  title: string;
  url?: string;
  icon?: NavIcon;
  items?: NavSubItem[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const WORKSPACE_NAV_GROUPS: NavGroup[] = [
  {
    label: "Build",
    items: [
      { title: "Links", url: "/", icon: LinkIcon },
      { title: "Domains", url: "/domains", icon: Globe },
      { title: "Bio Links", url: "/bio-links", icon: PhoneIcon },
    ],
  },
  {
    label: "Analyze",
    items: [
      { title: "Analytics", url: "/analytics", icon: BarChart2 },
      { title: "Campaigns", url: "/campaigns", icon: BarChart2 },
    ],
  },
  {
    label: "Organize",
    items: [
      { title: "Tags", url: "/settings/library/tags", icon: Tag },
      {
        title: "UTM Templates",
        url: "/settings/library/utm-template",
        icon: DiamondPlus,
      },
    ],
  },
  {
    label: "Manage",
    items: [
      {
        title: "Settings",
        icon: SettingsIcon,
        items: [
          { title: "General", url: "/settings" },
          { title: "Integrations", url: "/settings/integrations" },
          { title: "Billing", url: "/settings/billing" },
          { title: "API Keys", url: "/settings/api-keys" },
          { title: "Team", url: "/settings/team" },
        ],
      },
    ],
  },
];

export const NAV_ACCESS_CONTROL = {
  restrictedSubItems: {
    Billing: ["owner"] as const,
    "API key": ["owner", "admin"] as const,
    "API Keys": ["owner", "admin"] as const,
    General: ["owner", "admin"] as const,
  },
} as const;

/** Routes that are not nav entries but should still title correctly. */
const EXTRA_TITLES: Record<string, string> = {
  upgrade: "Upgrade",
  account: "Account",
};

/** Parent landing routes (e.g. /settings/library with no trailing leaf). */
const PARENT_TITLES: Record<string, string> = {
  library: "Library",
};

/** "General" is the workspace settings root — title it "Settings". */
const SUB_TITLE_OVERRIDES: Record<string, string> = {
  General: "Settings",
};

/**
 * Resolve the page header title from the current pathname using the same
 * nav config the sidebar renders. Falls back to "Links" (the workspace root).
 */
export function getWorkspacePageTitle(
  pathname: string,
  workspaceslug?: string,
): string {
  if (!workspaceslug) return "Links";
  if (pathname.startsWith("/bio-links")) return "Bio Links";

  // Strip the workspace prefix so paths match the relative nav URLs.
  const rest = pathname.startsWith(`/${workspaceslug}`)
    ? pathname.slice(workspaceslug.length + 1)
    : pathname;
  const norm = rest === "" ? "/" : rest;

  for (const group of WORKSPACE_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.url && item.url === norm) return item.title;
      const sub = item.items?.find((s) => s.url === norm);
      if (sub) return SUB_TITLE_OVERRIDES[sub.title] ?? sub.title;
    }
  }

  const segments = norm.split("/").filter(Boolean);
  const last = segments.at(-1) ?? "";
  const secondLast = segments.at(-2) ?? "";

  if (EXTRA_TITLES[last]) return EXTRA_TITLES[last];
  if (PARENT_TITLES[last]) return PARENT_TITLES[last];
  if (PARENT_TITLES[secondLast]) return PARENT_TITLES[secondLast];

  return "Links";
}
