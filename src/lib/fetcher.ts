// fetcher.ts
import axios, { AxiosRequestConfig } from "axios";

export const fetcher = <T = unknown>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> => {
  return axios.get<T>(url, config).then((res) => res.data);
};
