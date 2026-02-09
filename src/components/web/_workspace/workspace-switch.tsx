"use client";

import { memo, useMemo, useCallback } from "react";
import { ChevronsUpDown, UserRoundPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRouter, usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { cn } from "@/lib/utils";
import CreateWorkspaceDialog from "./create-workspace-dialog";

// ============================================================================
// Types
// ============================================================================

interface WorkspaceArr {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  userRole: "owner" | "admin" | "member" | null;
}

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceArr[];
  workspaceslug: string;
}

// ============================================================================
// Constants
// ============================================================================

const AVATAR_SIZES = {
  small: 24,
  medium: 30,
} as const;

const FALLBACK_AVATAR_BASE = "https://avatar.vercel.sh";

// ============================================================================
// Utilities
// ============================================================================

function getFallbackAvatarUrl(slug: string): string {
  return `${FALLBACK_AVATAR_BASE}/${slug}.png`;
}

function isNonOwner(userRole: WorkspaceArr["userRole"]): boolean {
  return Boolean(userRole && userRole !== "owner");
}

function buildNewWorkspacePath(
  pathname: string,
  currentSlug: string,
  newSlug: string,
): string {
  const workspaceSlugPattern = `/${currentSlug}`;
  
  if (pathname.startsWith(workspaceSlugPattern)) {
    return pathname.replace(workspaceSlugPattern, `/${newSlug}`);
  }
  
  return `/${newSlug}${pathname}`;
}

// ============================================================================
// Sub-Components
// ============================================================================

const WorkspaceAvatar = memo<{
  workspace: WorkspaceArr;
  size: number;
  className?: string;
}>(({ workspace, size, className }) => {
  const avatarSrc = workspace.logo || getFallbackAvatarUrl(workspace.slug);

  return (
    <div className={className}>
      <Image
        src={avatarSrc}
        alt={workspace.name}
        width={size}
        height={size}
        className="size-full object-cover"
      />
    </div>
  );
});
WorkspaceAvatar.displayName = "WorkspaceAvatar";

const RoleIndicator = memo<{ userRole: WorkspaceArr["userRole"] }>(
  ({ userRole }) => {
    if (!isNonOwner(userRole)) return null;

    return (
      <UserRoundPlus 
        strokeWidth={1.5} 
        size={13} 
        className="ml-1 p-[1.5px]"
      />
    );
  }
);
RoleIndicator.displayName = "RoleIndicator";

const WorkspaceMenuItem = memo<{
  workspace: WorkspaceArr;
  isActive: boolean;
  index: number;
  onSelect: (workspace: WorkspaceArr) => void;
}>(({ workspace, isActive, index, onSelect }) => (
  <DropdownMenuItem
    onClick={() => onSelect(workspace)}
    className={cn(
      "cursor-pointer gap-2 p-2",
      isActive && "bg-accent text-accent-foreground",
    )}
    aria-current={isActive ? "page" : undefined}
  >
    <div
      className={cn(
        "flex size-6 items-center justify-center overflow-hidden rounded-full border",
        isActive && "border-accent-foreground/20",
      )}
    >
      <WorkspaceAvatar
        workspace={workspace}
        size={AVATAR_SIZES.small}
        className="size-full object-cover"
      />
    </div>
    <span className="flex items-center gap-1">
      <span className="truncate line-clamp-1">{workspace.name}</span>
      <RoleIndicator userRole={workspace.userRole} />
    </span>
    <DropdownMenuShortcut>{index + 1}</DropdownMenuShortcut>
  </DropdownMenuItem>
));
WorkspaceMenuItem.displayName = "WorkspaceMenuItem";

// ============================================================================
// Main Component
// ============================================================================

function WorkspaceSwitch({ workspaces, workspaceslug }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  // Find active workspace with fallback
  const activeWorkspace = useMemo(() => {
    const found = workspaces.find((ws) => ws?.slug === workspaceslug);
    const fallback = workspaces.find((ws) => ws?.id != null);
    return found ?? fallback ?? null;
  }, [workspaces, workspaceslug]);

  // Handle workspace switching
  const handleWorkspaceSwitch = useCallback(
    (workspace: WorkspaceArr) => {
      const newPath = buildNewWorkspacePath(pathname, workspaceslug, workspace.slug);
      router.refresh();
      router.push(newPath);
    },
    [pathname, router, workspaceslug]
  );

  // Render workspace menu items
  const workspaceMenuItems = useMemo(
    () =>
      activeWorkspace
        ? workspaces
            .filter((ws): ws is WorkspaceArr => ws?.id != null)
            .map((workspace, index) => (
              <WorkspaceMenuItem
                key={workspace.id}
                workspace={workspace}
                isActive={activeWorkspace.id === workspace.id}
                index={index}
                onSelect={handleWorkspaceSwitch}
              />
            ))
        : [],
    [workspaces, activeWorkspace, handleWorkspaceSwitch]
  );

  // Show skeleton if no valid workspaces
  const hasValidWorkspaces = workspaces.some((ws) => ws?.id != null);
  if (!hasValidWorkspaces || !activeWorkspace) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Skeleton className="h-10 w-full" />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
              aria-label="Select workspace"
            >
              <div className="bg-sidebar-border flex aspect-square size-8 items-center justify-center overflow-hidden rounded-full">
                <WorkspaceAvatar
                  workspace={activeWorkspace}
                  size={AVATAR_SIZES.medium}
                  className="size-full object-cover"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="flex items-center gap-1 truncate font-medium">
                  <span className="truncate line-clamp-1">
                    {activeWorkspace.name ?? "Select Workspace"}
                  </span>
                  <RoleIndicator userRole={activeWorkspace.userRole} />
                </span>
                <span className="truncate text-xs">
                  {activeWorkspace.slug ?? ""}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspaces
            </DropdownMenuLabel>
            {workspaceMenuItems}
            <DropdownMenuSeparator />
            <CreateWorkspaceDialog />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export default memo(WorkspaceSwitch);