import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { primarySql } from "@/server/neon";
import { resolveClickAttribution } from "@/lib/leads/click-cache";
import { sendLeadEvent } from "@/lib/tinybird/slugy_lead_events";

export interface TrackLeadInput {
  clickId: string;
  eventName: string;
  customerExternalId: string;
  customerEmail?: string | null;
  customerName?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type TrackLeadResult =
  | { ok: true; idempotent: boolean; leadEventId: string }
  | { ok: false; status: 404 | 409 | 422; message: string };

export async function trackLead(
  workspaceId: string,
  input: TrackLeadInput,
): Promise<TrackLeadResult> {
  const clickId = input.clickId.trim();
  const eventName = input.eventName.trim();
  const customerExternalId = input.customerExternalId.trim();

  if (!clickId || !eventName || !customerExternalId) {
    return {
      ok: false,
      status: 422,
      message: "clickId, eventName, and customerExternalId are required",
    };
  }

  const attribution = await resolveClickAttribution(clickId);
  if (!attribution || attribution.workspaceId !== workspaceId) {
    return { ok: false, status: 404, message: "Unknown clickId" };
  }

  const existing = await db.leadEvent.findUnique({
    where: {
      workspaceId_customerExternalId_eventName: {
        workspaceId,
        customerExternalId,
        eventName,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return { ok: true, idempotent: true, leadEventId: existing.id };
  }

  const timestamp = new Date().toISOString();
  let leadEventId: string;
  let created = false;

  try {
    const leadEvent = await db.$transaction(async (tx) => {
      await tx.leadCustomer.upsert({
        where: {
          workspaceId_externalId: {
            workspaceId,
            externalId: customerExternalId,
          },
        },
        create: {
          workspaceId,
          externalId: customerExternalId,
          email: input.customerEmail ?? undefined,
          name: input.customerName ?? undefined,
          clickId,
          linkId: attribution.linkId,
          country: attribution.country || undefined,
        },
        update: {
          email: input.customerEmail ?? undefined,
          name: input.customerName ?? undefined,
          clickId,
          linkId: attribution.linkId,
          country: attribution.country || undefined,
        },
      });

      return tx.leadEvent.create({
        data: {
          workspaceId,
          linkId: attribution.linkId,
          clickId,
          customerExternalId,
          eventName,
          customerEmail: input.customerEmail ?? undefined,
          customerName: input.customerName ?? undefined,
          metadata: input.metadata
            ? (JSON.parse(
                JSON.stringify(input.metadata),
              ) as Prisma.InputJsonValue)
            : undefined,
        },
        select: { id: true },
      });
    });

    leadEventId = leadEvent.id;
    created = true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await db.leadEvent.findUnique({
        where: {
          workspaceId_customerExternalId_eventName: {
            workspaceId,
            customerExternalId,
            eventName,
          },
        },
        select: { id: true },
      });
      if (raced) {
        return { ok: true, idempotent: true, leadEventId: raced.id };
      }
    }
    throw error;
  }

  if (created) {
    await Promise.allSettled([
      primarySql`
        UPDATE "links"
        SET leads = leads + 1, conversions = conversions + 1
        WHERE id = ${attribution.linkId}
      `,
      sendLeadEvent({
        timestamp,
        workspace_id: attribution.workspaceId,
        link_id: attribution.linkId,
        click_id: clickId,
        slug: attribution.slug,
        url: attribution.url,
        domain: attribution.domain,
        event_name: eventName,
        customer_external_id: customerExternalId,
        country: attribution.country,
        city: attribution.city,
        continent: attribution.continent,
        device: attribution.device,
        browser: attribution.browser,
        os: attribution.os,
        referer: attribution.referer,
      }),
    ]);
  }

  return { ok: true, idempotent: false, leadEventId };
}
