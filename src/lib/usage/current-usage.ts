import { Prisma } from "@prisma/client";

import { calculateUsagePeriod, isUsagePeriodExpired } from "@/lib/usage-period";
import { db } from "@/server/db";

type UsageClient = Prisma.TransactionClient | typeof db;

const usageSelect = {
  id: true,
  userId: true,
  workspaceId: true,
  linksCreated: true,
  clicksTracked: true,
  addedUsers: true,
  periodStart: true,
  periodEnd: true,
  createdAt: true,
  deletedAt: true,
} as const;

export type CurrentUsageRecord = Prisma.UsageGetPayload<{
  select: typeof usageSelect;
}>;

export async function ensureCurrentUsageRecord(
  client: UsageClient,
  input: { workspaceId: string; userId: string; now?: Date },
): Promise<CurrentUsageRecord> {
  if (client === db) {
    return db.$transaction((tx) => ensureCurrentUsageRecord(tx, input));
  }
  // All rollover paths serialize on the same workspace, including edge clicks.
  await client.$queryRaw`SELECT id FROM workspaces WHERE id = ${input.workspaceId} FOR UPDATE`;
  const now = input.now ?? new Date();

  const [currentUsage, memberCount] = await Promise.all([
    client.usage.findFirst({
      where: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: usageSelect,
    }),
    client.member.count({
      where: { workspaceId: input.workspaceId },
    }),
  ]);

  if (!currentUsage) {
    const { periodStart, periodEnd } = calculateUsagePeriod(null, now);
    return client.usage.create({
      data: {
        userId: input.userId,
        workspaceId: input.workspaceId,
        linksCreated: 0,
        clicksTracked: 0,
        addedUsers: memberCount,
        periodStart,
        periodEnd,
      },
      select: usageSelect,
    });
  }

  if (!isUsagePeriodExpired(currentUsage.periodEnd, now)) {
    return currentUsage;
  }

  await client.usage.updateMany({
    where: { id: currentUsage.id, deletedAt: null },
    data: { deletedAt: now },
  });

  const { periodStart, periodEnd } = calculateUsagePeriod(
    currentUsage.periodEnd,
    now,
  );

  const duplicate = await client.usage.findFirst({
    where: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      deletedAt: null,
      periodStart,
    },
    select: usageSelect,
  });
  if (duplicate) return duplicate;

  return client.usage.create({
    data: {
      userId: input.userId,
      workspaceId: input.workspaceId,
      linksCreated: 0,
      clicksTracked: 0,
      addedUsers: memberCount,
      periodStart,
      periodEnd,
    },
    select: usageSelect,
  });
}
