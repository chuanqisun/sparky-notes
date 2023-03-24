export type HitsApiProxy = <T>(endpoint: string, payload: T) => Promise<T>;

export function getHITSApiProxy(accessToken: string): HitsApiProxy {
  return async <T>(endpoint: string, payload: T) => {
    const result = await fetch(`${import.meta.env.VITE_HITS_API_ENDPOINT!}${endpoint}`, {
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json());

    return result;
  };
}
