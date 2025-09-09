// fetcher.ts
import axios, { AxiosRequestConfig } from "axios";

export const fetcher = async <T = unknown>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> => {
  const res = await axios.get<T>(url, config);
  return res.data;
};
