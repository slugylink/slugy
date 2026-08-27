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
    });
  } catch (error) {
    console.error("[Tinybird] lead_events ingest error:", error);
    throw error;
  }
}
