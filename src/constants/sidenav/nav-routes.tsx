import {
    LinkIcon,
    BarChart2,
    Smartphone,
    Settings,
    type LucideIcon
} from "lucide-react";

interface NavItem {
    title: string;
    url?: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: Array<{ title: string; url: string }>;
}

interface SidebarData {
    navMain: NavItem[];
}

export const SIDEBAR_DATA: Readonly<SidebarData> = {
    navMain: [
        { title: "Links", url: "/", icon: LinkIcon },
        { title: "Analytics", url: "/analytics", icon: BarChart2 },
        { title: "Gallery", url: "/gallery", icon: Smartphone },
        {
            title: "Settings",
            icon: Settings,
            items: [
                { title: "General", url: "/settings" },
                { title: "Billing", url: "/settings/billing" },
                { title: "Library", url: "/settings/library/tags" },
                { title: "Team", url: "/settings/team" },
                // { title: "API key", url: "/settings/tokens" },
            ],
        },
    ],
} as const;

// Define role-based access control for navigation items
export const NAV_ACCESS_CONTROL = {
    // Items that require specific roles
    restrictedItems: {
        // Settings: ["OWNER", "ADMIN", "MEMBER"] as const,
    },
    restrictedSubItems: {
        Billing: ["OWNER"] as const,
        "API key": ["OWNER", "ADMIN"] as const,
        General: ["OWNER", "ADMIN"] as const,
    },
} as const;