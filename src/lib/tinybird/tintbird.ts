import { tb } from "@/constants/tinybird";

const TINYBIRD_API_URL = `https://api.us-east.aws.tinybird.co/v0/events?name=${tb.click_events}`;
const TINYBIRD_API_KEY_DATASOURCE = process.env.TINYBIRD_API_KEY_DATASOURCE!;

export interface AnalyticsEvent {
  linkId: string;
  clickId?: string; // Optional
  workspaceId: string;
  slug: string;
  url: string;
  ip: string;
  country: string;
  city: string;
  continent: string;
  device: string;
  browser: string;
  os: string;
  ua: string;
  referer: string;
}

export async function sendEventsToTinybird(event: AnalyticsEvent) {
  try {
    const sanitizedEvent = {
      linkId: event.linkId ?? "unknown",
      clickId: event.clickId ?? null,
      slug: event.slug ?? "unknown",
      url: event.url ?? "unknown",
      workspaceId: event.workspaceId ?? "unknown",
      ip: event.ip ?? "unknown",
      country: event.country ?? "unknown",
      city: event.city ?? "unknown",
      continent: event.continent ?? "unknown",
      browser: event.browser ?? "unknown",
      os: event.os ?? "unknown",
      device: event.device ?? "unknown",
      ua: event.ua ?? "unknown",
      referer: event.referer ?? "Direct",
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(TINYBIRD_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TINYBIRD_API_KEY_DATASOURCE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sanitizedEvent),
    });

    if (!response.ok) {
      console.error("❌ Tinybird error:", await response.text());
    }
  } catch (error) {
    console.error("❌ Tinybird analytics error:", error);
  }
}
