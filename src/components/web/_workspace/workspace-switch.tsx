"use client";

import { memo, useMemo, useCallback } from "react";
import { ChevronsUpDown, Users } from "lucide-react";
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

const WorkspaceAvatar = memo<{
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
        isActive && "bg-accent text-accent-foreground"
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
          size={24}
          className="size-full object-cover"
        />
      </div>
      <span className="flex items-center gap-1">
        {workspace.name}
        {workspace.userRole && workspace.userRole !== "owner" && (
          <Users className="h-3 w-3 text-muted-foreground" />
        )}
      </span>
      <DropdownMenuShortcut>{index + 1}</DropdownMenuShortcut>
    </DropdownMenuItem>
));
WorkspaceMenuItem.displayName = "WorkspaceMenuItem";

const WorkspaceSwitch = ({
  workspaces,
  workspaceslug,
}: WorkspaceSwitcherProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  const activeWorkspace = useMemo(() => {
    const found = workspaces.find((ws) => ws?.slug === workspaceslug);
    const fallback = workspaces.find((ws) => ws?.id != null);
    return found ?? fallback ?? null;
  }, [workspaces, workspaceslug]);

  const handleWorkspaceSwitch = useCallback(
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
                  size={30}
                  className="size-full object-cover"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium flex items-center gap-1">
                  {activeWorkspace.name ?? "Select Workspace"}
                  {activeWorkspace.userRole &&
                    activeWorkspace.userRole !== "owner" && (
                      <Users className="h-3 w-3 text-muted-foreground" />
                    )}
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
