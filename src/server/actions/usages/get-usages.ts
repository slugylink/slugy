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

    // Parallel database queries for better performance
    const [workspace, usage] = await Promise.all([
      // Fetch workspace with user membership check
      db.workspace.findFirst({
        where: {
          slug: workspaceslug,
          OR: [
            { userId }, // Direct owner
            {
              members: {
                some: {
                  userId,
                },
              },
            }, // Team member
          ],
        },
        select: {
          id: true,
          maxClicksLimit: true,
          maxLinksLimit: true,
          maxUsers: true,
        },
      }),

      // Fetch latest usage entry
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
          periodEnd: true,
        },
      }),
    ]);

    if (!workspace) {
      return { workspace: null, usage: null };
    }

    return { workspace, usage };
  } catch (error) {
    // Log error for debugging but don't expose details to client
    console.error("Failed to fetch usage data:", {
      workspaceslug,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return { workspace: null, usage: null };
  }
}
