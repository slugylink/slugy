"use client";

import { memo, useMemo } from "react";
import { parseAsString, useQueryState } from "nuqs";
import AnalyticsChart from "@/components/web/_analytics/chart";
import {
  DEMO_ANALYTICS_DATA,
  parseAnalyticsEvent,
} from "@/constants/data/demo-analytics-data";

/**
 * Feature-section demo of Click analytics.
 * Renders the production `AnalyticsChart` (timeseries view) with the
 * analytics page demo data — no API calls. Like the dashboard, the dataset
 * swaps with the active Clicks / Leads / Sales tab.
 */
export const AnalyticsDemoVisual = memo(function AnalyticsDemoVisual() {
  const [eventParam] = useQueryState("event", parseAsString);
  const event = parseAnalyticsEvent(eventParam);

  const data = useMemo(() => {
    if (event === "sales") {
      return DEMO_ANALYTICS_DATA.sales.revenueOverTime?.map((item) => ({
        time: String(item.time),
        clicks: item.revenue,
        sales: item.sales,
      }));
    }
    if (event === "leads") {
      return DEMO_ANALYTICS_DATA.leads.clicksOverTime.map((item) => ({
        time: String(item.time),
        clicks: item.clicks,
      }));
    }
    return DEMO_ANALYTICS_DATA.clicks.clicksOverTime.map((item) => ({
      time: String(item.time),
      clicks: item.clicks,
    }));
  }, [event]);

  return (
    <section className="mx-auto max-w-4xl">
      <AnalyticsChart
        data={data}
        totalClicks={DEMO_ANALYTICS_DATA.clicks.totalClicks}
        totalLeads={DEMO_ANALYTICS_DATA.leads.totalClicks}
        totalSales={DEMO_ANALYTICS_DATA.sales.totalClicks}
        totalRevenue={DEMO_ANALYTICS_DATA.sales.totalRevenue}
        timePeriod="30d"
        canUseLeadTracking
        canUseSalesAnalytics
        hideSalesCount
        compactHeader
      />
    </section>
  );
});

AnalyticsDemoVisual.displayName = "AnalyticsDemoVisual";
