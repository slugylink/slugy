import { fetcher } from "./fetcher";
import type { SWRConfiguration } from "swr";

export const swrConfig: SWRConfiguration = {
  fetcher,
  dedupingInterval: 30000, // 30 seconds
  errorRetryCount: 3,
  errorRetryInterval: 2000,
  revalidateOnMount: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  keepPreviousData: true,
  loadingTimeout: 10000,
  // Error handling
  onError: (error: Error, key) => {
    console.error(`SWR Error on ${key}:`, error);
  },
  // Optimize for large datasets
  compare: (a, b) => {
    // Custom comparison for analytics data to prevent unnecessary re-renders
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      const sampleSize = Math.min(5, a.length);
      for (let i = 0; i < sampleSize; i++) {
        if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
      }
      return true;
    }
    return a === b;
  },
};
