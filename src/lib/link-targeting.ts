import { z } from "zod";
import { isHttpUrl } from "@/lib/url-policy";

export const MAX_GEO_TARGETS = 10;
export const COUNTRY_CODE_REGEX = /^[a-z]{2}$/;

export type GeoTargetMap = Record<string, string>;

const httpUrlSchema = z
  .string()
  .url()
  .refine((value) => isHttpUrl(value), {
    message: "Only http(s) URLs are allowed",
  });

export const geoTargetSchema = z
  .record(z.string(), httpUrlSchema)
  .nullable()
  .optional()
  .superRefine((value, ctx) => {
    if (!value) return;

    const entries = Object.entries(value);
    if (entries.length > MAX_GEO_TARGETS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Geo targeting supports up to ${MAX_GEO_TARGETS} countries`,
      });
      return;
    }

    for (const [code] of entries) {
      const normalized = code.trim().toLowerCase();
      if (!COUNTRY_CODE_REGEX.test(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid country code "${code}". Use ISO 3166-1 alpha-2 (e.g. "us").`,
        });
      }
    }
  })
  .transform((value) => {
    if (value === undefined) return undefined;
    if (!value) return null;

    const normalized: GeoTargetMap = {};
    for (const [code, url] of Object.entries(value)) {
      const key = code.trim().toLowerCase();
      if (!COUNTRY_CODE_REGEX.test(key)) continue;
      normalized[key] = url;
    }

    return Object.keys(normalized).length > 0 ? normalized : null;
  });

export function normalizeGeoInput(
  value: unknown,
): GeoTargetMap | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;

  const normalized: GeoTargetMap = {};
  for (const [code, url] of Object.entries(value as Record<string, unknown>)) {
    if (typeof url !== "string") continue;
    const key = code.trim().toLowerCase();
    const trimmedUrl = url.trim();
    if (!COUNTRY_CODE_REGEX.test(key) || !trimmedUrl) continue;
    normalized[key] = trimmedUrl;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

export function parseGeoFromCache(value: unknown): GeoTargetMap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result: GeoTargetMap = {};
  for (const [code, url] of Object.entries(value as Record<string, unknown>)) {
    if (typeof url !== "string" || !url) continue;
    const key = code.toLowerCase();
    if (!COUNTRY_CODE_REGEX.test(key)) continue;
    result[key] = url;
  }
  return Object.keys(result).length > 0 ? result : null;
}

export function canUseGeoTargeting(planType: string | null | undefined) {
  return planType?.toLowerCase() === "pro";
}

/** Resolve final redirect URL: geo match → default. */
export function resolveTargetUrl(input: {
  defaultUrl: string;
  geo?: GeoTargetMap | null;
  country?: string | null;
}): string {
  const country = input.country?.trim().toLowerCase();
  if (country && country !== "unknown" && input.geo?.[country]) {
    return input.geo[country]!;
  }

  return input.defaultUrl;
}
