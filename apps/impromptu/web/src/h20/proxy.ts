export type H20Proxy = <T, K>(/** Format: `/path/to/api...` */ endpoint: string, payload: T) => Promise<K>;

export function getH20Proxy(accessToken: string): H20Proxy {
  return async <T, K>(endpoint: string, payload: T) => {
    const result = await fetch(`${import.meta.env.VITE_H20_SERVER_ENDPOINT!}${endpoint}`, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json());

    return result as K;
  };
}
