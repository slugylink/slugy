import axios, { AxiosRequestConfig, isAxiosError } from "axios";

type EtagEntry = {
  etag: string;
  data: unknown;
};

/** In-memory ETag cache for private API GETs (per browser tab). */
const etagCache = new Map<string, EtagEntry>();

/**
 * Default JSON GET fetcher for SWR.
 * Sends If-None-Match when we have a prior ETag and reuses cached body on 304.
 */
export const fetcher = async <T = unknown>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> => {
  const cached = etagCache.get(url);
  const headers: AxiosRequestConfig["headers"] = {
    ...config?.headers,
    ...(cached?.etag ? { "If-None-Match": cached.etag } : {}),
  };

  try {
    const res = await axios.get<T>(url, {
      ...config,
      headers,
      validateStatus: (status) =>
        (status >= 200 && status < 300) || status === 304,
    });

    if (res.status === 304 && cached) {
      return cached.data as T;
    }

    const etagHeader = res.headers.etag ?? res.headers.ETag;
    if (typeof etagHeader === "string" && etagHeader.length > 0) {
      etagCache.set(url, { etag: etagHeader, data: res.data });
    } else {
      etagCache.delete(url);
    }

    return res.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 304 && cached) {
      return cached.data as T;
    }
    throw error;
  }
};

/** Drop cached ETag for a URL (or all keys matching a predicate). */
export function invalidateFetcherEtag(
  match: string | ((url: string) => boolean),
) {
  if (typeof match === "string") {
    etagCache.delete(match);
    return;
  }
  for (const key of etagCache.keys()) {
    if (match(key)) etagCache.delete(key);
  }
}
