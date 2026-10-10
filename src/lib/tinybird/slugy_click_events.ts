import { tb } from "@/constants/tinybird";
import { enqueueTinybirdEvent } from "@/lib/tinybird/outbox";
import { normalizeContinentKey } from "@/lib/analytics/geo";

export interface LinkClickEvent {
  timestamp?: string;
  campaign_id?: string;
  quality_score?: number | null;
  is_bot?: boolean;
  is_duplicate?: boolean;
  link_id: string;
  workspace_id: string;
  click_id?: string;
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
  await enqueueTinybirdEvent(tb.link_click_events, {
    campaign_id: event.campaign_id ?? "",
    quality_score: event.quality_score ?? null,
    is_bot: event.is_bot ? 1 : 0,
    is_duplicate: event.is_duplicate ? 1 : 0,
    timestamp: event.timestamp ?? new Date().toISOString(),
    link_id: event.link_id,
    workspace_id: event.workspace_id,
    click_id: event.click_id ?? null,
    slug: event.slug,
    url: event.url,
    domain: event.domain,
    ip: event.ip,
    country: event.country ?? "",
    city: event.city ?? "",
    // Normalize before save: stored values were mixed (`asia` vs `Asia`
    // vs `AS`) while every GROUP BY is case-sensitive, which split one
    // continent into multiple rows. Empty stays empty (no Unknown rows).
    continent: event.continent ? normalizeContinentKey(event.continent) : "",
    device: event.device ?? "",
    browser: event.browser ?? "",
    os: event.os ?? "",
    ua: event.ua ?? "",
    referer: event.referer ?? "",
    trigger: event.trigger ?? null,
    user_id: event.user_id ?? null,
    utm_source: event.utm_source ?? "",
    utm_medium: event.utm_medium ?? "",
    utm_campaign: event.utm_campaign ?? "",
    utm_term: event.utm_term ?? "",
    utm_content: event.utm_content ?? "",
  });
}
