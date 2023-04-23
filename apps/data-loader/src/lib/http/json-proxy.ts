import axios, { type AxiosRequestConfig } from "axios";
import axiosRetry, { type IAxiosRetryConfig } from "axios-retry";

export type JsonProxy<RequestType, ResponseType> = (payload: RequestType) => Promise<ResponseType>;

export interface ProxyConfig {
  axiosConfig?: AxiosRequestConfig;
  retryConfig?: IAxiosRetryConfig;
}
export function jsonProxy<RequestType, ResponseType>(endpoint: string, config?: ProxyConfig): JsonProxy<RequestType, ResponseType> {
  const axiosInstance = axios.create();
  axiosRetry(axiosInstance, config?.retryConfig);

  return async (payload) => {
    return axiosInstance
      .post(endpoint, payload, {
        ...config?.axiosConfig,
        headers: {
          "Content-Type": "application/json",
          ...config?.axiosConfig?.headers,
        },
      })
      .then((res) => res.data);
  };
}
