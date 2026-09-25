import type { NextRequest } from "next/server";

export const UNKNOWN_GEO_VALUE = "unknown";

/** ISO-3166-1 alpha-2 → continent slug used in analytics. */
const COUNTRY_TO_CONTINENT: Record<string, string> = {
  AF: "asia",
  AX: "europe",
  AL: "europe",
  DZ: "africa",
  AS: "oceania",
  AD: "europe",
  AO: "africa",
  AI: "north america",
  AQ: "antarctica",
  AG: "north america",
  AR: "south america",
  AM: "asia",
  AW: "north america",
  AU: "oceania",
  AT: "europe",
  AZ: "asia",
  BS: "north america",
  BH: "asia",
  BD: "asia",
  BB: "north america",
  BY: "europe",
  BE: "europe",
  BZ: "north america",
  BJ: "africa",
  BM: "north america",
  BT: "asia",
  BO: "south america",
  BQ: "north america",
  BA: "europe",
  BW: "africa",
  BV: "antarctica",
  BR: "south america",
  IO: "asia",
  BN: "asia",
  BG: "europe",
  BF: "africa",
  BI: "africa",
  CV: "africa",
  KH: "asia",
  CM: "africa",
  CA: "north america",
  KY: "north america",
  CF: "africa",
  TD: "africa",
  CL: "south america",
  CN: "asia",
  CX: "oceania",
  CC: "oceania",
  CO: "south america",
  KM: "africa",
  CG: "africa",
  CD: "africa",
  CK: "oceania",
  CR: "north america",
  HR: "europe",
  CU: "north america",
  CW: "north america",
  CY: "asia",
  CZ: "europe",
  DK: "europe",
  DJ: "africa",
  DM: "north america",
  DO: "north america",
  EC: "south america",
  EG: "africa",
  SV: "north america",
  GQ: "africa",
  ER: "africa",
  EE: "europe",
  SZ: "africa",
  ET: "africa",
  FK: "south america",
  FO: "europe",
  FJ: "oceania",
  FI: "europe",
  FR: "europe",
  GF: "south america",
  PF: "oceania",
  TF: "antarctica",
  GA: "africa",
  GM: "africa",
  GE: "asia",
  DE: "europe",
  GH: "africa",
  GI: "europe",
  GR: "europe",
  GL: "north america",
  GD: "north america",
  GP: "north america",
  GU: "oceania",
  GT: "north america",
  GG: "europe",
  GN: "africa",
  GW: "africa",
  GY: "south america",
  HT: "north america",
  HM: "antarctica",
  VA: "europe",
  HN: "north america",
  HK: "asia",
  HU: "europe",
  IS: "europe",
  IN: "asia",
  ID: "asia",
  IR: "asia",
  IQ: "asia",
  IE: "europe",
  IM: "europe",
  IL: "asia",
  IT: "europe",
  CI: "africa",
  JM: "north america",
  JP: "asia",
  JE: "europe",
  JO: "asia",
  KZ: "asia",
  KE: "africa",
  KI: "oceania",
  KP: "asia",
  KR: "asia",
  KW: "asia",
  KG: "asia",
  LA: "asia",
  LV: "europe",
  LB: "asia",
  LS: "africa",
  LR: "africa",
  LY: "africa",
  LI: "europe",
  LT: "europe",
  LU: "europe",
  MO: "asia",
  MG: "africa",
  MW: "africa",
  MY: "asia",
  MV: "asia",
  ML: "africa",
  MT: "europe",
  MH: "oceania",
  MQ: "north america",
  MR: "africa",
  MU: "africa",
  YT: "africa",
  MX: "north america",
  FM: "oceania",
  MD: "europe",
  MC: "europe",
  MN: "asia",
  ME: "europe",
  MS: "north america",
  MA: "africa",
  MZ: "africa",
  MM: "asia",
  NA: "africa",
  NR: "oceania",
  NP: "asia",
  NL: "europe",
  NC: "oceania",
  NZ: "oceania",
  NI: "north america",
  NE: "africa",
  NG: "africa",
  NU: "oceania",
  NF: "oceania",
  MK: "europe",
  MP: "oceania",
  NO: "europe",
  OM: "asia",
  PK: "asia",
  PW: "oceania",
  PS: "asia",
  PA: "north america",
  PG: "oceania",
  PY: "south america",
  PE: "south america",
  PH: "asia",
  PN: "oceania",
  PL: "europe",
  PT: "europe",
  PR: "north america",
  QA: "asia",
  RE: "africa",
  RO: "europe",
  RU: "europe",
  RW: "africa",
  BL: "north america",
  SH: "africa",
  KN: "north america",
  LC: "north america",
  MF: "north america",
  PM: "north america",
  VC: "north america",
  WS: "oceania",
  SM: "europe",
  ST: "africa",
  SA: "asia",
  SN: "africa",
  RS: "europe",
  SC: "africa",
  SL: "africa",
  SG: "asia",
  SX: "north america",
  SK: "europe",
  SI: "europe",
  SB: "oceania",
  SO: "africa",
  ZA: "africa",
  GS: "south america",
  SS: "africa",
  ES: "europe",
  LK: "asia",
  SD: "africa",
  SR: "south america",
  SJ: "europe",
  SE: "europe",
  CH: "europe",
  SY: "asia",
  TW: "asia",
  TJ: "asia",
  TZ: "africa",
  TH: "asia",
  TL: "asia",
  TG: "africa",
  TK: "oceania",
  TO: "oceania",
  TT: "north america",
  TN: "africa",
  TR: "asia",
  TM: "asia",
  TC: "north america",
  TV: "oceania",
  UG: "africa",
  UA: "europe",
  AE: "asia",
  GB: "europe",
  US: "north america",
  UM: "oceania",
  UY: "south america",
  UZ: "asia",
  VU: "oceania",
  VE: "south america",
  VN: "asia",
  VG: "north america",
  VI: "north america",
  WF: "oceania",
  EH: "africa",
  YE: "asia",
  ZM: "africa",
  ZW: "africa",
};

/** Cloudflare `cf-ipcontinent` uses 2-letter codes — expand to full slugs. */
const CONTINENT_CODE_MAP: Record<string, string> = {
  AF: "africa",
  AN: "antarctica",
  AS: "asia",
  EU: "europe",
  NA: "north america",
  OC: "oceania",
  SA: "south america",
};

function normalizeContinent(raw: string | null, country: string): string {
  const trimmed = raw?.trim();
  if (trimmed) {
    const upper = trimmed.toUpperCase();
    if (CONTINENT_CODE_MAP[upper]) return CONTINENT_CODE_MAP[upper];
    const lower = trimmed.toLowerCase();
    if (lower && lower !== UNKNOWN_GEO_VALUE) return lower;
  }
  return continentForCountry(country);
}

function decodeCity(value: string | null): string {
  if (!value) return UNKNOWN_GEO_VALUE;
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded || UNKNOWN_GEO_VALUE;
  } catch {
    const trimmed = value.trim();
    return trimmed || UNKNOWN_GEO_VALUE;
  }
}

/** Normalize a country header (CF-IPCountry / x-vercel-ip-country). */
function normalizeCountry(raw: string | null): string {
  const code = raw?.trim().toUpperCase();
  // Cloudflare sends XX (unknown) and T1/T2 (Tor) — not real countries.
  if (!code || code === "XX" || code === "T1" || code === "T2") {
    return UNKNOWN_GEO_VALUE;
  }
  if (!/^[A-Z]{2}$/.test(code)) return UNKNOWN_GEO_VALUE;
  return code.toLowerCase();
}

export function continentForCountry(countryCode: string): string {
  if (!countryCode || countryCode === UNKNOWN_GEO_VALUE) {
    return UNKNOWN_GEO_VALUE;
  }
  return (
    COUNTRY_TO_CONTINENT[countryCode.trim().toUpperCase()] ?? UNKNOWN_GEO_VALUE
  );
}

export interface GeoData {
  country: string;
  city: string;
  continent: string;
  region: string;
}

/**
 * Single source of truth for visitor geolocation.
 *
 * Important: when Cloudflare proxies in front of Vercel, Vercel's
 * `x-vercel-ip-*` headers describe Cloudflare's edge PoP — not the visitor.
 * So behind Cloudflare (`cf-ray` present) we only trust Cloudflare headers
 * and derive the rest, instead of storing a confidently-wrong city.
 */
export function getGeoData(req: NextRequest): GeoData {
  const headers = req.headers;
  const hasCloudflare = Boolean(headers.get("cf-ray"));

  const country = normalizeCountry(
    headers.get("cf-ipcountry") ??
      (hasCloudflare ? null : headers.get("x-vercel-ip-country")),
  );

  const city = decodeCity(
    headers.get("cf-ipcity") ??
      (hasCloudflare ? null : headers.get("x-vercel-ip-city")),
  );

  const continent = normalizeContinent(headers.get("cf-ipcontinent"), country);

  const region =
    (
      headers.get("cf-region") ??
      (hasCloudflare ? null : headers.get("x-vercel-ip-country-region")) ??
      ""
    ).trim() || UNKNOWN_GEO_VALUE;

  return { country, city, continent, region };
}
