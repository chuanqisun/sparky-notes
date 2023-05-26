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
      .then((res) => res.data)
      .catch(function (error) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.log(error.response.data);
          console.log(error.response.status);
          console.log(error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          console.log(error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.log("Error", error.message);
        }
        console.log(error.config);
      });
  };
}
