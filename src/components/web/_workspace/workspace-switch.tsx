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

const WorkspaceSwitch: React.FC<WorkspaceSwitcherProps> = ({
  workspaces,
  workspaceslug,
}) => {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { isMobile } = useSidebar();

  // Memoize active workspace to avoid recalculation on rerender
  const activeWorkspace = React.useMemo(
    () => workspaces.find((ws) => ws.slug === workspaceslug),
    [workspaces, workspaceslug],
  );

  const handleWorkspaceSwitch = React.useCallback(
    (workspace: WorkspaceArr) => {
      // Replace only the first occurrence of /currentSlug/ in the pathname to avoid unexpected replacements
      const workspaceSlugPattern = `/${workspaceslug}`;
      const newPath = pathname.startsWith(workspaceSlugPattern)
        ? pathname.replace(workspaceSlugPattern, `/${workspace.slug}`)
        : `/${workspace.slug}${pathname}`;

      router.push(newPath);
    },
    [pathname, router, workspaceslug],
  );

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
            >
              <div className="bg-sidebar-border flex aspect-square size-7 items-center justify-center overflow-hidden rounded-full">
                {activeWorkspace?.logo ? (
                  <Image
                    src={activeWorkspace.logo}
                    alt={activeWorkspace.name}
                    width={30}
                    height={30}
                    className="size-full object-cover"
                  />
                ) : (
                  <Image
                    src={`https://avatar.vercel.sh/${activeWorkspace?.slug ?? "default"}.png`}
                    alt={activeWorkspace?.name ?? "Workspace Avatar"}
                    width={32}
                    height={32}
                    className="size-full object-cover"
                  />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeWorkspace?.name ?? "Select Workspace"}
                </span>
                <span className="truncate text-xs">
                  {activeWorkspace?.slug ?? ""}
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
            {workspaces.map((workspace, index) => {
              const isActive = activeWorkspace?.id === workspace.id;
              return (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => handleWorkspaceSwitch(workspace)}
                  className={`cursor-pointer gap-2 p-2 ${
                    isActive ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  <div
                    className={`flex size-6 items-center justify-center overflow-hidden rounded-full border ${
                      isActive ? "border-accent-foreground/20" : ""
                    }`}
                  >
                    {workspace.logo ? (
                      <Image
                        src={workspace.logo}
                        alt={workspace.name}
                        width={24}
                        height={24}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Image
                        src={`https://avatar.vercel.sh/${workspace.slug}.png`}
                        alt={workspace.name}
                        width={24}
                        height={24}
                        className="size-full object-cover"
                      />
                    )}
                  </div>
                  {workspace.name}
                  <DropdownMenuShortcut>{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <CreateWorkspaceDialog />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

export default WorkspaceSwitch;
