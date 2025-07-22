import { fetcher } from "./fetcher";
import type { SWRConfiguration } from "swr";

export const swrConfig: SWRConfiguration = {
  fetcher,
  dedupingInterval: 5000, // avoid duplicate requests within 5s
  errorRetryCount: 3, // retry failed requests up to 3 times
  errorRetryInterval: 2000, // 2 seconds between retries
  revalidateOnMount: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  onError: (error: Error, key) => {
    console.error(`SWR Error on ${key}:`, error);
  },
};
