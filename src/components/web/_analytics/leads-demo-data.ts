export type AnalyticsEvent = "clicks" | "leads";

export function parseAnalyticsEvent(
  value: string | null | undefined,
): AnalyticsEvent {
  return value === "leads" ? "leads" : "clicks";
}
