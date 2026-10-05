import { db } from "@/server/db";

export async function getWorkspaceBySlugForMember(
  slug: string,
  userId: string,
) {
  return db.workspace.findFirst({
    where: {
      slug,
      deletedAt: null,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: { id: true, slug: true, userId: true },
  });
}

export async function requireWorkspaceManager(slug: string, userId: string) {
  const workspace = await db.workspace.findFirst({
    where: {
      slug,
      deletedAt: null,
      OR: [
        { userId },
        { members: { some: { userId, role: { in: ["owner", "admin"] } } } },
      ],
    },
    select: { id: true, slug: true, userId: true },
  });
  return workspace;
}
