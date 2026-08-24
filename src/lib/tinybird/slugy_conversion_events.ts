import { tb } from "@/constants/tinybird";

const API_BASE = "https://api.us-east.aws.tinybird.co/v0";
const TINYBIRD_API_KEY = process.env.TINYBIRD_API_KEY!;
const TINYBIRD_TIMEOUT_MS = 5000;

export interface ConversionTinybirdEvent {
  timestamp?: string;
  event_id: string;
  click_id?: string | null;
  link_id: string;
  workspace_id: string;
  customer_id?: string | null;
  customer_external_id?: string | null;
  event_type: "lead" | "sale" | "custom";
  event_name: string;
  amount?: number | null;
  currency?: string | null;
  invoice_id?: string | null;
  payment_processor?: string | null;
  country?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function sendConversionEvent(
  event: ConversionTinybirdEvent,
): Promise<void> {
  if (!TINYBIRD_API_KEY) {
    console.error("[Tinybird] TINYBIRD_API_KEY missing; skip conversion event");
    return;
  }

  const payload = {
    timestamp: event.timestamp ?? new Date().toISOString(),
    event_id: event.event_id,
    click_id: event.click_id ?? "",
    link_id: event.link_id,
    workspace_id: event.workspace_id,
    customer_id: event.customer_id ?? "",
    customer_external_id: event.customer_external_id ?? "",
    event_type: event.event_type,
    event_name: event.event_name,
    amount: event.amount ?? null,
    currency: event.currency ?? "",
    invoice_id: event.invoice_id ?? "",
    payment_processor: event.payment_processor ?? "",
    country: event.country ?? "",
    metadata: event.metadata ? JSON.stringify(event.metadata) : "",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TINYBIRD_TIMEOUT_MS);

  try {
    const res = await fetch(
      `${API_BASE}/events?name=${tb.conversion_events}&wait=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TINYBIRD_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Tinybird conversion_events error:", res.status, text);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error(
        `Tinybird conversion timeout after ${TINYBIRD_TIMEOUT_MS}ms`,
      );
      return;
    }
    console.error("[Tinybird] conversion event error:", error);
  } finally {
    clearTimeout(timeoutId);
  }
}
