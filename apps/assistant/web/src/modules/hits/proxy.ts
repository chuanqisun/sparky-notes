import type { SearchOutput } from "./hits";

const HITS_PROXY_ENDPOINT = import.meta.env.VITE_HITS_PROXY_ENDPOINT;

export const getAuthenticatedProxy = (accessToken: string) => async (payload: any) => {
  const result = await fetch(`${HITS_PROXY_ENDPOINT}/api/search/index`, {
    method: "post",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  }).then((res) => res.json());

  return result as SearchOutput;
};
