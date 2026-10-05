export const INTEGRATION_EVENTS = [
  "lead.created",
  "sale.created",
  "link.clicked",
] as const;

export type IntegrationEventName = (typeof INTEGRATION_EVENTS)[number];

export const INTEGRATION_PROVIDERS = [
  "slack",
  "zapier",
  "make",
  "polar",
  "shopify",
  "wordpress",
  "stripe",
  "segment",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export interface IntegrationCatalogEntry {
  provider: IntegrationProvider | string;
  name: string;
  category: string;
  description: string;
  docsUrl: string;
  connectType: "oauth" | "webhook" | "api-key" | "guide";
}

// Catalog ordering: automation + notifications first.
export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  {
    provider: "slack",
    name: "Slack",
    category: "Productivity",
    description:
      "Real-time lead/sale notifications and /shorten links without leaving Slack.",
    docsUrl: "/blogs/lead-conversion-tracking",
    connectType: "oauth",
  },
  {
    provider: "zapier",
    name: "Zapier",
    category: "Automation",
    description: "Connect Slugy to 7,000+ apps. New Lead / New Sale triggers.",
    docsUrl: "/blogs/lead-conversion-tracking",
    connectType: "webhook",
  },
  {
    provider: "make",
    name: "Make.com",
    category: "Automation",
    description: "Connect Slugy to 2,000+ apps via Make webhooks + API key.",
    docsUrl: "/blogs/lead-conversion-tracking",
    connectType: "webhook",
  },
  {
    provider: "polar",
    name: "Polar",
    category: "Payments",
    description:
      "Attribute Polar orders to Slugy clicks. Pass slugy_click_id at checkout.",
    docsUrl: "/blogs/lead-conversion-tracking",
    connectType: "guide",
  },
  {
    provider: "shopify",
    name: "Shopify",
    category: "Payments",
    description: "Attribute Shopify orders to Slugy links via web pixel.",
    docsUrl: "/blogs/lead-conversion-tracking",
    connectType: "guide",
  },
  {
    provider: "wordpress",
    name: "WordPress",
    category: "CMS",
    description:
      "Auto-shorten post links with an API key. Publish once, track all.",
    docsUrl: "/blogs/lead-conversion-tracking",
    connectType: "api-key",
  },
  {
    provider: "stripe",
    name: "Stripe",
    category: "Payments",
    description:
      "Attribute Stripe checkouts to Slugy clicks (deferred; Polar first).",
    docsUrl: "/blogs/lead-conversion-tracking",
    connectType: "guide",
  },
  {
    provider: "segment",
    name: "Segment",
    category: "Analytics",
    description: "Forward lead/sale events to Segment via webhooks.",
    docsUrl: "/blogs/lead-conversion-tracking",
    connectType: "webhook",
  },
];

export function isIntegrationEvent(
  value: string,
): value is IntegrationEventName {
  return (INTEGRATION_EVENTS as readonly string[]).includes(value);
}

export function isSaleEvent(eventName: string, saleAmount: number): boolean {
  return eventName === "sale" || saleAmount > 0;
}
