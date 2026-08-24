import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";
import { resolveClickAttribution } from "@/lib/conversions/click-attribution";
import { sendConversionEvent } from "@/lib/tinybird/slugy_conversion_events";

export type TrackLeadInput = {
  workspaceId: string;
  /** Required — from ?slugy_id= on the destination URL */
  clickId: string;
  eventName?: string;
  /** Your user id — upserts Customer and enables identity across events */
  externalId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  customerAvatar?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type TrackLeadResult =
  | {
      ok: true;
      duplicate?: boolean;
      event: {
        id: string;
        type: "lead";
        eventName: string;
        clickId: string;
        linkId: string;
        externalId: string | null;
        customerId: string | null;
      };
    }
  | { ok: false; status: number; message: string };

/**
 * Track a conversion lead attributed to a short-link click.
 * v1: lead-only + Customer upsert. Sale/custom stay deferred.
 */
export async function trackLead(
  input: TrackLeadInput,
): Promise<TrackLeadResult> {
  const clickId = input.clickId?.trim();
  if (!clickId) {
    return { ok: false, status: 422, message: "clickId is required" };
  }

  const eventName = (input.eventName?.trim() || "Lead").slice(0, 255);
  const externalId = input.externalId?.trim() || null;

  const attribution = await resolveClickAttribution(clickId);
  if (!attribution) {
    return { ok: false, status: 404, message: "Unknown clickId" };
  }
  if (attribution.workspaceId !== input.workspaceId) {
    return {
      ok: false,
      status: 403,
      message: "clickId does not belong to this workspace",
    };
  }

  // Dedupe: same click + event name (and externalId when provided)
  const existing = await db.conversionEvent.findFirst({
    where: {
      workspaceId: input.workspaceId,
      type: "lead",
      clickId,
      eventName,
      ...(externalId ? { customerExternalId: externalId } : {}),
    },
  });
  if (existing) {
    return {
      ok: true,
      duplicate: true,
      event: {
        id: existing.id,
        type: "lead",
        eventName: existing.eventName,
        clickId: existing.clickId!,
        linkId: existing.linkId,
        externalId: existing.customerExternalId,
        customerId: existing.customerId,
      },
    };
  }

  // Keep Customer table useful: upsert when the integrator sends an identity
  let customerId: string | null = null;
  if (externalId) {
    const customer = await db.customer.upsert({
      where: {
        workspaceId_externalId: {
          workspaceId: input.workspaceId,
          externalId,
        },
      },
      create: {
        workspaceId: input.workspaceId,
        externalId,
        email: input.customerEmail ?? null,
        name: input.customerName ?? null,
        avatar: input.customerAvatar ?? null,
        clickId,
        linkId: attribution.linkId,
        country: attribution.country ?? null,
      },
      update: {
        email: input.customerEmail ?? undefined,
        name: input.customerName ?? undefined,
        avatar: input.customerAvatar ?? undefined,
        clickId,
        linkId: attribution.linkId,
        country: attribution.country ?? undefined,
      },
    });
    customerId = customer.id;
  }

  const event = await db.conversionEvent.create({
    data: {
      workspaceId: input.workspaceId,
      linkId: attribution.linkId,
      clickId,
      customerId,
      customerExternalId: externalId,
      type: "lead",
      eventName,
      amount: null,
      currency: null,
      invoiceId: null,
      paymentProcessor: null,
      metadata: (input.metadata ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
    },
  });

  await db.link
    .update({
      where: { id: attribution.linkId },
      data: { leads: { increment: 1 } },
    })
    .catch((err) => console.error("[Lead counter]", err));

  void sendConversionEvent({
    event_id: event.id,
    click_id: clickId,
    link_id: attribution.linkId,
    workspace_id: input.workspaceId,
    customer_id: customerId,
    customer_external_id: externalId,
    event_type: "lead",
    event_name: eventName,
    amount: null,
    currency: null,
    invoice_id: null,
    payment_processor: null,
    country: attribution.country,
    metadata: input.metadata ?? null,
  });

  return {
    ok: true,
    event: {
      id: event.id,
      type: "lead",
      eventName: event.eventName,
      clickId,
      linkId: event.linkId,
      externalId,
      customerId,
    },
  };
}

/*
 * Deferred — sale / custom conversion APIs (Customer already supports linking):
 * POST /api/track/sale, POST /api/track/custom remain 501 until enabled.
 */
