export type AnalyticsEvent = "clicks" | "leads";
export type AnalyticsView = "timeseries" | "funnel";

export function parseAnalyticsEvent(
  value: string | null | undefined,
): AnalyticsEvent {
  return value === "leads" ? "leads" : "clicks";
}

export function parseAnalyticsView(
  value: string | null | undefined,
): AnalyticsView {
  return value === "funnel" ? "funnel" : "timeseries";
}
