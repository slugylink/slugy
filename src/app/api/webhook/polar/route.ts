import { NextRequest, NextResponse } from "next/server";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { inngest } from "@/inngest/client";
import {
  LOG_PREFIX,
  type PolarWebhookEventType,
} from "@/lib/subscription/polar-webhook-handlers";

const SUPPORTED_TYPES = new Set<PolarWebhookEventType>([
  "order.created",
  "order.paid",
  "subscription.created",
  "subscription.updated",
  "subscription.active",
  "subscription.canceled",
  "subscription.revoked",
]);

function isPolarWebhookEventType(type: string): type is PolarWebhookEventType {
  return SUPPORTED_TYPES.has(type as PolarWebhookEventType);
}

/**
 * Verify Polar signature, enqueue durable processing, return fast 200.
 * Uses the Standard Webhooks `webhook-id` header for Inngest idempotency so
 * Polar redeliveries of the same delivery do not double-apply billing changes.
 * Legitimate successive updates for the same subscription keep distinct ids.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error(`${LOG_PREFIX} POLAR_WEBHOOK_SECRET is not configured`);
    return NextResponse.json(
      { ok: false, error: "webhook_not_configured" },
      { status: 500 },
    );
  }

  const requestBody = await req.text();
  const webhookHeaders = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
  };

  let webhookPayload: { type?: string; data?: unknown };
  try {
    webhookPayload = validateEvent(
      requestBody,
      webhookHeaders,
      webhookSecret,
    ) as { type?: string; data?: unknown };
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ received: false }, { status: 403 });
    }

    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();
    if (
      lower.includes("unknown event type") ||
      lower.includes("failed to parse event")
    ) {
      console.warn(
        `${LOG_PREFIX} Ignoring unsupported webhook event from Polar:`,
        message,
      );
      return NextResponse.json({
        ok: true,
        ignored: "unsupported_event_type",
      });
    }

    console.error(`${LOG_PREFIX} Webhook verification failed:`, error);
    return NextResponse.json(
      { ok: false, error: "webhook_processing_failed" },
      { status: 500 },
    );
  }

  const eventType = webhookPayload.type;
  if (!eventType || !isPolarWebhookEventType(eventType)) {
    console.warn(
      `${LOG_PREFIX} Ignoring unsupported webhook event type:`,
      eventType ?? "missing",
    );
    return NextResponse.json({
      ok: true,
      ignored: "unsupported_event_type",
    });
  }

  const polarEventId = webhookHeaders["webhook-id"] || null;

  try {
    await inngest.send({
      ...(polarEventId ? { id: `polar-webhook-${polarEventId}` } : {}),
      name: "polar/webhook.received",
      data: {
        type: eventType,
        payload: webhookPayload.data,
        polarEventId,
      },
    });
  } catch (error) {
    // Fail the HTTP response so Polar retries delivery if the queue write fails.
    console.error(
      `${LOG_PREFIX} Failed to enqueue webhook for Inngest:`,
      error,
    );
    return NextResponse.json(
      { ok: false, error: "webhook_enqueue_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
