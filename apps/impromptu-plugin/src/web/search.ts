export interface WebSearchPayload {
  q: string;
}

export type WebSearchResponse = {
  pages: {
    title: string;
    snippet: string;
    url: string;
  }[];
};

export type WebSearchProxy = (payload: WebSearchPayload) => Promise<WebSearchResponse>;

export function getWebSearchProxy(accessToken: string): WebSearchProxy {
  const proxy = async (payload: WebSearchPayload) => {
    const result = await fetch(process.env.VITE_WEB_SEARCH_ENDPOINT!, {
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json());

    return result;
  };

  return proxy;
}

export async function webSearch(proxy: WebSearchProxy, payload: WebSearchPayload) {
  const result = await proxy(payload);
  return result;
}
