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
      linkId: event.linkId,
      clickId: event.clickId,
      workspaceId: event.workspaceId,
      slug: event.slug,
      url: event.url,
      ip: event.ip,
      country: event.country,
      city: event.city,
      continent: event.continent,
      browser: event.browser,
      os: event.os,
      device: event.device,
      ua: event.ua,
      referer: event.referer,
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
      console.error("[Tinybird] error:", await response.text());
    }
  } catch (error) {
    console.error("[Tinybird] analytics error:", error);
  }
}
