import {
  tinybird,
  type SlugyLeadEventsRow,
} from "@/lib/tinybird/could/tinybird";

export type LeadEventPayload = Omit<SlugyLeadEventsRow, "timestamp"> & {
  timestamp?: string;
};

export async function sendLeadEvent(event: LeadEventPayload): Promise<void> {
  try {
    await tinybird.slugyLeadEvents.ingest({
      timestamp: event.timestamp ?? new Date().toISOString(),
      workspace_id: event.workspace_id,
      link_id: event.link_id,
      click_id: event.click_id,
      slug: event.slug,
      url: event.url,
      domain: event.domain,
      event_name: event.event_name,
      customer_external_id: event.customer_external_id,
      country: event.country ?? "",
      city: event.city ?? "",
      continent: event.continent ?? "",
      device: event.device ?? "",
      browser: event.browser ?? "",
      os: event.os ?? "",
      referer: event.referer ?? "",
      utm_source: event.utm_source ?? "",
      utm_medium: event.utm_medium ?? "",
      utm_campaign: event.utm_campaign ?? "",
      utm_term: event.utm_term ?? "",
      utm_content: event.utm_content ?? "",
      sale_amount: event.sale_amount ?? 0,
      sale_currency: event.sale_currency ?? "",
    });
  } catch (error) {
    console.error("[Tinybird] lead_events ingest error:", error);
    throw error;
  }
}
