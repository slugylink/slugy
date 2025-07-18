import * as React from "react";
import { NavMain } from "@/components/web/_sidebar/nav-main";
import { NavUser } from "@/components/web/_sidebar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import WorkspaceSwitch from "@/components/web/_workspace/workspace-switch";
import UsageStats from "./usage-stats";

export interface WorkspaceMinimal {
  id: string;
  name: string;
  slug: string;
  userRole: "owner" | "admin" | "member" | null;
}

interface AppSidebarProps
  extends Omit<React.ComponentProps<typeof Sidebar>, "workspaces"> {
  workspaces: WorkspaceMinimal[];
  workspaceslug: string;
}

export default async function AppSidebar({
  workspaceslug,
  workspaces,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitch
          workspaces={workspaces}
          workspaceslug={workspaceslug}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain workspaces={workspaces} workspaceslug={workspaceslug} />
      </SidebarContent>
      <SidebarFooter>
        <UsageStats workspaceslug={workspaceslug} />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
