import { fetcher } from "./fetcher";
import type { SWRConfiguration } from "swr";

export const swrConfig: SWRConfiguration = {
  fetcher,
  dedupingInterval: 7000, // 7 seconds
  errorRetryCount: 2,
  errorRetryInterval: 3000,
  revalidateOnMount: false,
  revalidateOnFocus: true,
  revalidateOnReconnect: false,
  keepPreviousData: true,
  loadingTimeout: 5000,
  revalidateIfStale: true,
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
