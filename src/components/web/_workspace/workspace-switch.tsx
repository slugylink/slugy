"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
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

// --------------------------
// Types
// --------------------------
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

// --------------------------
// Workspace Avatar Component
// --------------------------
const WorkspaceAvatar = React.memo<{
  workspace: WorkspaceArr;
  size: number;
  className?: string;
}>(({ workspace, size, className }) => (
  <div className={className}>
    {workspace.logo ? (
      <Image
        src={workspace.logo}
        alt={workspace.name}
        width={size}
        height={size}
        className="size-full object-cover"
      />
    ) : (
      <Image
        src={`https://avatar.vercel.sh/${workspace.slug}.png`}
        alt={workspace.name}
        width={size}
        height={size}
        className="size-full object-cover"
      />
    )}
  </div>
));
WorkspaceAvatar.displayName = "WorkspaceAvatar";

// --------------------------
// Workspace Menu Item Component
// --------------------------
const WorkspaceMenuItem = React.memo<{
  workspace: WorkspaceArr;
  isActive: boolean;
  index: number;
  onSelect: (workspace: WorkspaceArr) => void;
}>(({ workspace, isActive, index, onSelect }) => {
  return (
    <DropdownMenuItem
      key={workspace.id}
      onClick={() => onSelect(workspace)}
      className={cn(
        "cursor-pointer gap-2 p-2",
        isActive && "bg-accent text-accent-foreground"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <div
        className={cn(
          "flex size-6 items-center justify-center overflow-hidden rounded-full border",
          isActive && "border-accent-foreground/20"
        )}
      >
        <WorkspaceAvatar
          workspace={workspace}
          size={24}
          className="size-full object-cover"
        />
      </div>
      {workspace.name}
      <DropdownMenuShortcut>{index + 1}</DropdownMenuShortcut>
    </DropdownMenuItem>
  );
});
WorkspaceMenuItem.displayName = "WorkspaceMenuItem";

// --------------------------
// Main Workspace Switch Component
// --------------------------
const WorkspaceSwitch = ({
  workspaces,
  workspaceslug,
}: WorkspaceSwitcherProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  // Memoize active workspace
  const activeWorkspace = React.useMemo(() => {
    const found = workspaces.find((ws) => ws.slug === workspaceslug);
    // Fallback to first workspace to avoid undefined and keep UI usable
    return found ?? workspaces[0];
  }, [workspaces, workspaceslug]);

  // Memoize workspace switch handler
  const handleWorkspaceSwitch = React.useCallback(
    (workspace: WorkspaceArr) => {
      const workspaceSlugPattern = `/${workspaceslug}`;
      const newPath = pathname.startsWith(workspaceSlugPattern)
        ? pathname.replace(workspaceSlugPattern, `/${workspace.slug}`)
        : `/${workspace.slug}${pathname}`;
      router.refresh();
      router.push(newPath);
    },
    [pathname, router, workspaceslug]
  );

  // Memoize workspace menu items
  const workspaceMenuItems = React.useMemo(
    () =>
      workspaces.map((workspace, index) => (
        <WorkspaceMenuItem
          key={workspace.id}
          workspace={workspace}
          isActive={activeWorkspace.id === workspace.id}
          index={index}
          onSelect={handleWorkspaceSwitch}
        />
      )),
    [workspaces, activeWorkspace.id, handleWorkspaceSwitch]
  );

  // Loading skeleton if no workspaces yet
  if (!workspaces.length) {
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
                  size={30}
                  className="size-full object-cover"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeWorkspace.name ?? "Select Workspace"}
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
};

export default WorkspaceSwitch;
