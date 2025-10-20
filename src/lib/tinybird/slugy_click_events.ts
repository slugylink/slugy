import { tb } from "@/constants/tinybird";

const API_BASE = "https://api.us-east.aws.tinybird.co/v0";
const TINYBIRD_API_KEY = process.env.TINYBIRD_API_KEY!;

export interface LinkClickEvent {
  timestamp?: string; // ISO string milliseconds
  link_id: string;
  workspace_id: string;
  slug: string;
  url: string;
  domain: string;
  ip: string;
  country?: string;
  city?: string;
  continent?: string;
  device?: string;
  browser?: string;
  os?: string;
  ua?: string;
  referer?: string;
  trigger?: string;
  user_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export async function sendLinkClickEvent(event: LinkClickEvent) {
  const payload = {
    timestamp: event.timestamp ?? new Date().toISOString(),
    link_id: event.link_id,
    workspace_id: event.workspace_id,
    slug: event.slug,
    url: event.url,
    domain: event.domain,
    ip: event.ip,
    country: event.country ?? "",
    city: event.city ?? "",
    continent: event.continent ?? "",
    device: event.device ?? "",
    browser: event.browser ?? "",
    os: event.os ?? "",
    ua: event.ua ?? "",
    referer: event.referer ?? "",
    trigger: event.trigger ?? "",
    user_id: event.user_id ?? "",
    utm_source: event.utm_source ?? "",
    utm_medium: event.utm_medium ?? "",
    utm_campaign: event.utm_campaign ?? "",
    utm_term: event.utm_term ?? "",
    utm_content: event.utm_content ?? "",
  };

  const res = await fetch(
    `${API_BASE}/events?name=${tb.link_click_events}&wait=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TINYBIRD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Tinybird link_click_events error:", res.status, text);
  }
}
