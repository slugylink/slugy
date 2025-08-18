"use server";

import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface WorkspaceData {
  maxClicksLimit: number;
  maxLinksLimit: number;
  maxUsers: number;
}

interface UsageDetails {
  clicksTracked: number;
  linksCreated: number;
  addedUsers: number;
  periodEnd: Date;
}

interface UsageData {
  workspace: WorkspaceData | null;
  usage: UsageDetails | null;
}

export async function getUsages({
  workspaceslug,
}: {
  workspaceslug: string;
}): Promise<UsageData> {
  try {
    // Authenticate session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;
    if (!userId) {
      return { workspace: null, usage: null };
    }

    // Fetch workspace
    const workspace = await db.workspace.findFirst({
      where: {
        slug: workspaceslug,
        userId,
      },
      select: {
        id: true,
        maxClicksLimit: true,
        maxLinksLimit: true,
        maxUsers: true,
      },
    });

    if (!workspace) {
      return { workspace: null, usage: null };
    }

    // Fetch latest usage entry
    const usage = await db.usage.findFirst({
      where: {
        userId,
        workspaceId: workspace.id,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        clicksTracked: true,
        linksCreated: true,
        addedUsers: true,
        periodEnd: true,
      },
    });

    if (!usage) {
      console.warn(
        `No usage data found for workspaceId=${workspace.id}, userId=${userId}`,
      );
      return { workspace, usage: null };
    }

    return { workspace, usage };
  } catch (error) {
    console.error("Failed to fetch usage data:", error);
    return { workspace: null, usage: null };
  }
}
