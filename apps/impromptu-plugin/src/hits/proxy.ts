import type { SearchOutput } from "./hits";

export interface SearchProxy {
  (payload: any): Promise<SearchOutput>;
}

export function getSearchProxy(accessToken: string): SearchProxy {
  return async (payload: any) => {
    const result = await fetch(process.env.VITE_HITS_SEARCH_ENDPOINT!, {
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json());

    return result as SearchOutput;
  };
}
