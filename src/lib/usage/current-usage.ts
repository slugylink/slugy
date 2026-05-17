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

  await client.usage.update({
    where: { id: currentUsage.id },
    data: { deletedAt: now },
  });

  const { periodStart, periodEnd } = calculateUsagePeriod(
    currentUsage.periodEnd,
    now,
  );

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
