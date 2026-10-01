import { fetcher } from "./fetcher";
import type { SWRConfiguration } from "swr";

export const swrConfig: SWRConfiguration = {
  fetcher,
  dedupingInterval: 7000, // 7 seconds
  errorRetryCount: 2,
  errorRetryInterval: 3000,
  revalidateOnMount: true,
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
    // Custom comparison for analytics data to prevent unnecessary re-renders.
    // Must not ignore tail changes: check length + all items when small,
    // first/last samples when large.
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      if (a.length <= 50) {
        for (let i = 0; i < a.length; i++) {
          if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
        }
        return true;
      }
      const sampleSize = 5;
      for (let i = 0; i < sampleSize; i++) {
        if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
        const j = a.length - 1 - i;
        if (JSON.stringify(a[j]) !== JSON.stringify(b[j])) return false;
      }
      return true;
    }
    return a === b;
  },
};
