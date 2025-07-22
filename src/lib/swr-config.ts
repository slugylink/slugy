import { fetcher } from "./fetcher";

export const swrConfig = {
  fetcher: fetcher,
  dedupingInterval: 5000,
  errorRetryCount: 3,
  revalidateOnMount: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  errorRetryInterval: 2000,
  keepPreviousData: true,
  onError: (error: Error) => {
    console.error("SWR Error:", error);
  },
};
