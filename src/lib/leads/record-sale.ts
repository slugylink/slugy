import { db } from "@/server/db";
import { primarySql } from "@/server/neon";
import { resolveClickAttribution } from "@/lib/leads/click-cache";
import { emitIntegrationEvent } from "@/lib/integrations/dispatcher";
import {
  canUseLeadTracking,
  canUseSalesAnalytics,
  getWorkspaceOwnerPlanType,
} from "@/lib/subscription/entitlements";

export interface RecordSaleInput {
  clickId: string;
  customerExternalId: string;
  customerEmail?: string | null;
  customerName?: string | null;
  saleAmount: number;
  saleCurrency?: string | null;
  source: string;
  sourceId?: string | null;
}

export interface RecordSaleOptions {
  /** When set, attribution must resolve to this workspace (API-key callers). */
  expectedWorkspaceId?: string;
}

export type RecordSaleResult =
  | { ok: true; leadEventId: string; idempotent: boolean }
  | { ok: false; message: string; status: 403 | 404 };

const EVENT_NAME = "sale";

/**
 * Shared sale writer for Polar / Shopify / Stripe attribution.
 * Reuses the LeadCustomer/LeadEvent shape from trackLead so analytics,
 * Tinybird, and outbound webhooks stay consistent.
 * Enforces the same paywall as /api/leads_track: lead tracking is Pro+,
 * revenue attribution is Growth-only.
 */
export async function recordIntegrationSale(
  input: RecordSaleInput,
  opts?: RecordSaleOptions,
): Promise<RecordSaleResult> {
  const clickId = input.clickId.trim();
  const customerExternalId = input.customerExternalId.trim();
  if (!clickId || !customerExternalId) {
    return {
      ok: false,
      status: 404,
      message: "clickId and customerExternalId are required",
    };
  }
  if (!Number.isFinite(input.saleAmount) || input.saleAmount <= 0) {
    return {
      ok: false,
      status: 404,
      message: "saleAmount must be positive",
    };
  }

  const attribution = await resolveClickAttribution(clickId);
  if (!attribution)
    return { ok: false, status: 404, message: "Unknown clickId" };

  if (
    opts?.expectedWorkspaceId &&
    attribution.workspaceId !== opts.expectedWorkspaceId
  ) {
    return {
      ok: false,
      status: 403,
      message: "clickId belongs to another workspace",
    };
  }

  const ownerPlanType = await getWorkspaceOwnerPlanType(
    attribution.workspaceId,
  );
  if (!canUseLeadTracking(ownerPlanType)) {
    return {
      ok: false,
      status: 403,
      message: "Lead tracking requires a Pro or Growth plan.",
    };
  }
  if (!canUseSalesAnalytics(ownerPlanType)) {
    return {
      ok: false,
      status: 403,
      message: "Sales attribution requires a Growth plan.",
    };
  }

  const saleCurrency =
    input.saleCurrency?.trim().toUpperCase().slice(0, 3) || undefined;

  const existing = await db.leadEvent.findUnique({
    where: {
      workspaceId_customerExternalId_eventName: {
        workspaceId: attribution.workspaceId,
        customerExternalId,
        eventName: EVENT_NAME,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: true, leadEventId: existing.id, idempotent: true };
  }

  const leadEvent = await db
    .$transaction(async (tx) => {
      await tx.leadCustomer.upsert({
        where: {
          workspaceId_externalId: {
            workspaceId: attribution.workspaceId,
            externalId: customerExternalId,
          },
        },
        create: {
          workspaceId: attribution.workspaceId,
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
        },
      });

      return tx.leadEvent.create({
        data: {
          campaignId: attribution.campaignId ?? null,
          workspaceId: attribution.workspaceId,
          linkId: attribution.linkId,
          clickId,
          customerExternalId,
          eventName: EVENT_NAME,
          customerEmail: input.customerEmail ?? undefined,
          customerName: input.customerName ?? undefined,
          saleAmount: input.saleAmount,
          saleCurrency,
          metadata: {
            source: input.source,
            sourceId: input.sourceId ?? null,
          },
        },
        select: { id: true },
      });
    })
    .catch(async (error: unknown) => {
      const { Prisma } = await import("@prisma/client");
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const raced = await db.leadEvent.findUnique({
          where: {
            workspaceId_customerExternalId_eventName: {
              workspaceId: attribution.workspaceId,
              customerExternalId,
              eventName: EVENT_NAME,
            },
          },
          select: { id: true },
        });
        if (raced) return raced;
      }
      throw error;
    });

  await primarySql`
    UPDATE "links"
    SET leads = leads + 1, conversions = conversions + 1
    WHERE id = ${attribution.linkId}
  `.catch(() => undefined);

  emitIntegrationEvent({
    workspaceId: attribution.workspaceId,
    event: "sale.created",
    payload: {
      leadEventId: leadEvent.id,
      linkId: attribution.linkId,
      slug: attribution.slug,
      domain: attribution.domain,
      clickId,
      customerExternalId,
      customerEmail: input.customerEmail ?? null,
      saleAmount: input.saleAmount,
      saleCurrency: saleCurrency ?? null,
      source: input.source,
      sourceId: input.sourceId ?? null,
    },
  });

  return { ok: true, leadEventId: leadEvent.id, idempotent: false };
}

/** Extract `slugy_click_id` from checkout metadata across providers. */
export function extractClickId(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata) return null;
  const candidates = [
    metadata["slugy_click_id"],
    metadata["slugyClickId"],
    metadata["slgy_id"],
    metadata["slugy_id"],
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}
