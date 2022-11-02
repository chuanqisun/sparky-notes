import type { SearchOutput } from "./hits";

const HITS_API_HOST = import.meta.env.VITE_HITS_API_HOST;

export const getAuthenticatedProxy = (accessToken: string) => async (payload: any) => {
  const result = await fetch(`${HITS_API_HOST}/api/search/index`, {
    method: "post",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  }).then((res) => res.json());

  return result as SearchOutput;
};
