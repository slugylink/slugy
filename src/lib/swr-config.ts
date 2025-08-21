import { fetcher } from "./fetcher";
import type { SWRConfiguration } from "swr";

export const swrConfig: SWRConfiguration = {
  fetcher,
  dedupingInterval: 5000,
  errorRetryCount: 3,
  errorRetryInterval: 2000,
  revalidateOnMount: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  keepPreviousData: true,
  // refreshInterval: 15000,

  onError: (error: Error, key) => {
    console.error(`SWR Error on ${key}:`, error);
    // e.g., Sentry.captureException(error);
  },
};
