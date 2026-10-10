import { inngest } from "../client";
import { db } from "@/server/db";
import { resend } from "@/lib/resend";
import { redis } from "@/lib/redis";
import { checkDestination } from "@/lib/campaigns/check-destination";
import { conversionAnomaly } from "@/lib/campaigns/validation";
import {
  canUseLeadTracking,
  getWorkspaceOwnerPlanType,
} from "@/lib/subscription/entitlements";

export const campaignAlerts = inngest.createFunction(
  {
    id: "campaign-health-alerts",
    concurrency: 1,
    triggers: [{ cron: "*/2 * * * *" }],
  },
  async ({ step }) => {
    let cursor: string | undefined;
    let checked = 0;
    do {
      const campaigns = await step.run(`campaigns-${cursor || "start"}`, () =>
        db.campaign.findMany({
          where: {
            status: "active",
            alertsEnabled: true,
            workspace: { deletedAt: null },
          },
          select: { id: true },
          orderBy: { id: "asc" },
          take: 100,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
      );
      if (!campaigns.length) break;
      for (const { id } of campaigns) {
        await step.run(`check-${id}`, async () => {
          const campaign = await db.campaign.findUnique({
            where: { id },
            include: {
              workspace: {
                include: { creator: { select: { id: true, email: true } } },
              },
            },
          });
          if (
            !campaign ||
            !canUseLeadTracking(
              await getWorkspaceOwnerPlanType(campaign.workspaceId),
            )
          )
            return;
          const owner = campaign.workspace.creator;
          async function alert(kind: string, message: string) {
            const key = `campaign:alert:${id}:${kind}`;
            if (!(await redis.set(key, "1", { nx: true, ex: 3600 }))) return;
            try {
              await db.notification.create({
                data: {
                  userId: owner.id,
                  email: owner.email,
                  type: "warning",
                  message,
                },
              });
              if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
                const result = await resend.emails.send(
                  {
                    from: process.env.EMAIL_FROM,
                    to: owner.email,
                    subject: `Slugy campaign alert: ${campaign!.name}`,
                    text: message,
                  },
                  {
                    idempotencyKey: `${key}:${Math.floor(Date.now() / 3600000)}`,
                  },
                );
                if (result.error) throw new Error(result.error.message);
              }
            } catch (error) {
              await redis.del(key);
              throw error;
            }
          }
          const hour = new Date(Date.now() - 3600000);
          const [total, bots] = await Promise.all([
            db.analytics.count({
              where: {
                campaignId: id,
                clickedAt: { gte: hour },
                qualityScore: { not: null },
              },
            }),
            db.analytics.count({
              where: {
                campaignId: id,
                clickedAt: { gte: hour },
                isBot: true,
                qualityScore: { not: null },
              },
            }),
          ]);
          if (total && bots / total > 0.2)
            await alert(
              "bots",
              `${campaign.name}: ${((bots / total) * 100).toFixed(1)}% bot traffic in the last hour (${bots}/${total}).`,
            );
          // Compare a completed UTC day with seven completed days, never a partial day.
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);
          const counts = await Promise.all(
            Array.from({ length: 8 }, (_, i) =>
              db.leadEvent.count({
                where: {
                  campaignId: id,
                  createdAt: {
                    gte: new Date(+today - (i + 1) * 86400000),
                    lt: new Date(+today - i * 86400000),
                  },
                },
              }),
            ),
          );
          if (conversionAnomaly(counts.slice(1), counts[0]))
            await alert(
              `conversions:${today.toISOString().slice(0, 10)}`,
              `${campaign.name}: yesterday had ${counts[0]} conversions, outside two standard deviations of the previous seven days.`,
            );
          let linkCursor: string | undefined;
          do {
            const links = await db.link.findMany({
              where: {
                campaignId: id,
                deletedAt: null,
                isArchived: false,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              },
              select: { id: true, url: true },
              take: 20,
              orderBy: { id: "asc" },
              ...(linkCursor ? { cursor: { id: linkCursor }, skip: 1 } : {}),
            });
            if (!links.length) break;
            await Promise.all(
              links.map(async (link) => {
                let status: number | null;
                try {
                  status = await checkDestination(link.url);
                } catch {
                  status = 0;
                }
                if (status !== null && (status < 200 || status >= 300))
                  await alert(
                    `broken:${link.id}`,
                    `${campaign.name}: destination ${link.url} failed its HEAD check (${status || "network error"}).`,
                  );
              }),
            );
            linkCursor = links[links.length - 1].id;
          } while (linkCursor);
        });
        checked++;
      }
      cursor = campaigns[campaigns.length - 1].id;
    } while (cursor);
    return { checked };
  },
);
