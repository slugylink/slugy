import { Session } from "@/lib/auth";

// Type definitions for workspace data
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  userRole: "owner" | "admin" | "member" | null;
}

export interface LayoutData {
  workspaces: Workspace[];
  workspaceslug: string;
  session: Session;
  workspaceNotFound?: boolean;
}

// Type-safe workspace filtering utility (filters out null and undefined)
export function filterValidWorkspaces<T>(
  workspaces: T[]
): NonNullable<T>[] {
  return workspaces.filter((workspace): workspace is NonNullable<T> => workspace != null);
}
