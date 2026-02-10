import type { ComponentProps } from "react";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { NavMain } from "@/components/web/_sidebar/nav-main";
import { NavUser } from "@/components/web/_sidebar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import WorkspaceSwitch from "@/components/web/_workspace/workspace-switch";
import UsageStats from "./usage-stats";

// ============================================================================
// Types
// ============================================================================

export interface WorkspaceMinimal {
  id: string;
  name: string;
  slug: string;
  userRole: "owner" | "admin" | "member" | null;
}

interface AppSidebarProps
  extends Omit<ComponentProps<typeof Sidebar>, "workspaces"> {
  workspaces: WorkspaceMinimal[];
  workspaceslug: string;
}

// ============================================================================
// Constants
// ============================================================================

const FEEDBACK_URL =
  "https://github.com/slugylink/slugy/discussions/categories/feedback";

// ============================================================================
// Main Component
// ============================================================================

export default function AppSidebar({
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
        <Link href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="secondary" className="w-full">
            <MessagesSquare strokeWidth={1.5} />
            Feedback
          </Button>
        </Link>
        <UsageStats workspaceslug={workspaceslug} />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
