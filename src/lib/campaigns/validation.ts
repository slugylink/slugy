import { z } from "zod";

export const campaignSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9_-]{0,119}$/),
    status: z.enum(["active", "paused", "archived"]).default("active"),
    trafficSourceId: z.string().max(80).nullable().optional(),
    costModel: z.enum(["manual", "cpc", "cpm", "cpa"]).default("manual"),
    alertsEnabled: z.boolean().default(true),
  })
  .strict();

export const costSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((v) => {
        const d = new Date(v);
        return (
          Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v
        );
      }, "Invalid calendar date"),
    spend: z
      .union([
        z.number(),
        z
          .string()
          .trim()
          .regex(/^\d+(\.\d{1,4})?$/),
      ])
      .pipe(z.coerce.number().finite().min(0).max(1e12)),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/),
    source: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .refine(
        (v) => !/^[=+@-]/.test(v),
        "Source cannot start with a spreadsheet formula prefix",
      ),
  })
  .strict();
export const costsSchema = z
  .array(costSchema)
  .min(1)
  .max(1000)
  .superRefine((rows, ctx) => {
    const keys = new Set<string>();
    rows.forEach((row, i) => {
      const key = `${row.date}:${row.currency}:${row.source}`;
      if (keys.has(key))
        ctx.addIssue({
          code: "custom",
          path: [i],
          message: "Duplicate date/currency/source",
        });
      keys.add(key);
    });
  });

export function moneyMetrics(revenue: number, spend: number, leads: number) {
  return {
    revenue,
    spend,
    roas: spend > 0 ? revenue / spend : null,
    cpa: leads > 0 ? spend / leads : null,
  };
}

export function conversionAnomaly(baseline: number[], current: number) {
  if (baseline.length !== 7 || baseline.reduce((a, b) => a + b, 0) < 7)
    return false;
  const mean = baseline.reduce((a, b) => a + b, 0) / 7;
  const deviation = Math.sqrt(
    baseline.reduce((sum, n) => sum + (n - mean) ** 2, 0) / 7,
  );
  return Math.abs(current - mean) > Math.max(2 * deviation, 2);
}
