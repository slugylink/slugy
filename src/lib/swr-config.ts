import { fetcher } from "./fetcher";
import type { SWRConfiguration } from "swr";

export const swrConfig: SWRConfiguration = {
  fetcher,
  dedupingInterval: 10000,
  errorRetryCount: 3,
  errorRetryInterval: 2000,
  revalidateOnMount: true,
  revalidateOnFocus: false, // Prevent unnecessary refetches on focus
  revalidateOnReconnect: false, // Refresh data when connection is restored
  keepPreviousData: true,
  focusThrottleInterval: 5000, // Refetch data every 5 seconds
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
      // For analytics arrays, compare first few items to detect significant changes
      const sampleSize = Math.min(5, a.length);
      for (let i = 0; i < sampleSize; i++) {
        if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
      }
      return true;
    }
    return a === b;
  },
};
