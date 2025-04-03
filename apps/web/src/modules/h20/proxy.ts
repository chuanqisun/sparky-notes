export type H20Proxy = <T, K>(/** Format: `/path/to/api...` */ endpoint: string, payload: T, context?: H20ProxyContext) => Promise<K>;
export interface H20ProxyContext {
  abortSignal?: AbortSignal;
}

export function getH20Proxy(accessToken: string): H20Proxy {
  return async <T, K>(endpoint: string, payload: T, context?: H20ProxyContext) => {
    const result = await fetch(`${import.meta.env.VITE_H20_SERVER_HOST!}${endpoint}`, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
      signal: context?.abortSignal,
    }).then((res) => res.json());

    return result as K;
  };
}
