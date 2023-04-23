import axios, { type AxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";

export type JsonProxy<RequestType, ResponseType> = (payload: RequestType) => Promise<ResponseType>;

export interface ProxyConfig {
  header?: Record<string, string>;
  endpoint: string;
  httpAgent?: AxiosRequestConfig["httpAgent"];
  httpsAgent?: AxiosRequestConfig["httpsAgent"];
}
export function jsonProxy<RequestType, ResponseType>(config: ProxyConfig): JsonProxy<RequestType, ResponseType> {
  const axiosInstance = axios.create();
  axiosRetry(axiosInstance, {
    retries: 3,
    retryDelay: (count) => {
      console.log(`Retry: ${count}`);
      return count * 2000;
    },
    shouldResetTimeout: true,
    retryCondition: () => true,
  });

  return async (payload) => {
    return axiosInstance
      .post(config.endpoint, payload, {
        headers: {
          "Content-Type": "application/json",
          ...config.header,
        },
        httpAgent: config.httpAgent,
        httpsAgent: config.httpsAgent,
        timeout: 5000,
      })
      .then((res) => res.data);
  };
}
