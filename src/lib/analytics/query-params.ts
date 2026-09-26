import { z } from "zod";

const FILTER_MAX = 200;

const filterValueSchema = z
  .string()
  .max(FILTER_MAX)
  .nullable()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  });

export const analyticsTimePeriodSchema = z.enum([
  "24h",
  "7d",
  "30d",
  "3m",
  "12m",
  "all",
]);

export const analyticsFilterFieldsSchema = z
  .object({
    timePeriod: analyticsTimePeriodSchema,
    slug_key: filterValueSchema,
    country_key: filterValueSchema,
    city_key: filterValueSchema,
    continent_key: filterValueSchema,
    browser_key: filterValueSchema,
    os_key: filterValueSchema,
    referrer_key: filterValueSchema,
    device_key: filterValueSchema,
    destination_key: filterValueSchema,
    domain_key: filterValueSchema,
  })
  .strict();

export function tinybirdFilterParams(
  props: z.infer<typeof analyticsFilterFieldsSchema>,
) {
  return {
    date_range: props.timePeriod,
    slug: props.slug_key || "",
    url: props.destination_key || "",
    country: props.country_key || "",
    city: props.city_key || "",
    continent: props.continent_key || "",
    browser: props.browser_key || "",
    os: props.os_key || "",
    referer: props.referrer_key || "",
    device: props.device_key || "",
    domain: props.domain_key || "",
  };
}

const SALES_LEAD_FILTER_MAX = 200;

const salesLeadValueSchema = z
  .string()
  .max(SALES_LEAD_FILTER_MAX)
  .nullable()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  });

export const salesLeadFilterFieldsSchema = analyticsFilterFieldsSchema.extend({
  event_name: salesLeadValueSchema,
  customer_external_id: salesLeadValueSchema,
  utm_source: salesLeadValueSchema,
  utm_medium: salesLeadValueSchema,
  utm_campaign: salesLeadValueSchema,
  utm_term: salesLeadValueSchema,
  utm_content: salesLeadValueSchema,
});

/** Sales-lead analytics filters: click dimensions + sales attribution (event, customer, UTM). */
export function tinybirdLeadsFilterParams(
  props: z.infer<typeof salesLeadFilterFieldsSchema>,
) {
  return {
    ...tinybirdFilterParams(props),
    event_name: props.event_name || "",
    customer_external_id: props.customer_external_id || "",
    utm_source: props.utm_source || "",
    utm_medium: props.utm_medium || "",
    utm_campaign: props.utm_campaign || "",
    utm_term: props.utm_term || "",
    utm_content: props.utm_content || "",
  };
}
