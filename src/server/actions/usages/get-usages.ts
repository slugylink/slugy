"use server";
import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface UsageData {
  workspace: {
    maxClicksLimit: number;
    maxLinksLimit: number;
    maxUsers: number;
  } | null;
  usage: {
    clicksTracked: number;
    linksCreated: number;
    addedUsers: number;
    periodEnd: Date;
  } | null;
}

export async function getUsages({
  workspaceslug,
}: {
  workspaceslug: string;
}): Promise<UsageData> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { workspace: null, usage: null };
    }

    const userId = session.user.id;

    const workspace = await db.workspace.findFirst({
      where: {
        slug: workspaceslug,
        userId: userId,
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

    const usage = await db.usage.findFirst({
      where: {
        userId: userId,
        workspaceId: workspace.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        clicksTracked: true,
        linksCreated: true,
        addedUsers: true,
        periodEnd: true,
      },
    });

    if (!usage) {
      console.error(
        `Usage data not found for workspaceId: ${workspace.id} and userId: ${userId}`,
      );
      return { workspace, usage: null };
    }

    return { workspace, usage };
  } catch (error) {
    console.error("Failed to fetch usage data:", error);
    return { workspace: null, usage: null };
  }
}
