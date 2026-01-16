"use server";

import { db } from "@/server/db";
import { getAuthSession } from "@/lib/auth";

interface WorkspaceData {
  maxClicksLimit: number;
  maxLinksLimit: number;
  maxUsers: number;
}

interface UsageDetails {
  clicksTracked: number;
  linksCreated: number;
  addedUsers: number;
  periodStart: Date;
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
    const authResult = await getAuthSession();
    if (!authResult.success) {
      return { workspace: null, usage: null };
    }
    const { user } = authResult.session;
    const userId = user.id;

    const [workspace, usage] = await Promise.all([
      db.workspace.findFirst({
        where: {
          slug: workspaceslug,
          OR: [
            { userId },
            {
              members: {
                some: {
                  userId,
                },
              },
            },
          ],
        },
        select: {
          id: true,
          maxClicksLimit: true,
          maxLinksLimit: true,
          maxUsers: true,
        },
      }),

      db.usage.findFirst({
        where: {
          userId,
          workspace: {
            slug: workspaceslug,
            OR: [
              { userId },
              {
                members: {
                  some: {
                    userId,
                  },
                },
              },
            ],
          },
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        select: {
          clicksTracked: true,
          linksCreated: true,
          addedUsers: true,
          periodStart: true,
          periodEnd: true,
        },
      }),
    ]);

    if (!workspace) {
      return { workspace: null, usage: null };
    }

    return { workspace, usage };
  } catch (error) {
    console.error("Failed to fetch usage data:", {
      workspaceslug,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return { workspace: null, usage: null };
  }
}
