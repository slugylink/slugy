import { tb } from "@/constants/tinybird";

const TINYBIRD_API_URL = `https://api.us-east.aws.tinybird.co/v0/events?name=${tb.link_click_events}`;
const TINYBIRD_API_KEY = process.env.TINYBIRD_API_KEY!;

export interface AnalyticsEvent {
  workspaceId: string;
  linkId: string;
  alias_linkId: string | null;
  clickId: string | null;
  slug: string;
  url: string;
  domain: string;
  ip: string;
  country: string;
  city: string;
  continent: string;
  device: string;
  browser: string;
  os: string;
  ua: string;
  referer: string;
  referer_url: string;
  trigger: string;
  user_id: string | null;
  timestamp?: string;
}

export async function sendEventsToTinybird(event: AnalyticsEvent) {
  try {
    const sanitizedEvent = {
      workspaceId: event.workspaceId,
      linkId: event.linkId,
      alias_linkId: event.alias_linkId,
      clickId: event.clickId,
      slug: event.slug,
      url: event.url,
      domain: event.domain,
      ip: event.ip,
      country: event.country,
      city: event.city,
      continent: event.continent,
      device: event.device,
      browser: event.browser,
      os: event.os,
      ua: event.ua,
      referer: event.referer,
      referer_url: event.referer_url,
      trigger: event.trigger,
      user_id: event.user_id,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(TINYBIRD_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TINYBIRD_API_KEY}`,
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
