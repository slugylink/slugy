import { jsonWithETag } from "@/lib/http";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/server/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const { workspaceslug } = await params;

    const authResult = await getAuthSession();
    if (!authResult.success) {
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
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
      return jsonWithETag(req, { error: "Workspace not found" }, { status: 404 });
    }

    return jsonWithETag(req, { workspace, usage });
  } catch (error) {
    console.error("Failed to fetch usage data:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonWithETag(req, { error: "Internal server error" }, { status: 500 });
  }
}