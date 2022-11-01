import type { SearchOutput } from "./hits";

const HITS_API_HOST = import.meta.env.VITE_HITS_API_HOST;

export async function requestSearch(token: string, payload: any): Promise<SearchOutput> {
  const result = await fetch(`${HITS_API_HOST}/api/search/index`, {
    method: "post",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then((res) => res.json());

  return result;
}
