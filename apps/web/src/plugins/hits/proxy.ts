import type { SearchOutput } from "./hits";

export async function requestSearch(token: string, payload: any): Promise<SearchOutput> {
  const result = await fetch("http://localhost:5202/api/search/index", {
    method: "post",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then((res) => res.json());

  return result;
}
