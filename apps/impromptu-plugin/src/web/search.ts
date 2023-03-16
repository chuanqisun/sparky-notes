import { GenericLogData, Logger } from "../utils/logger";

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

export function getWebSearchProxy(accessToken: string, logger: Logger): WebSearchProxy {
  const proxy = async (payload: WebSearchPayload) => {
    const result = await fetch(process.env.VITE_WEB_SEARCH_ENDPOINT!, {
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json());

    logger?.log<GenericLogData>({
      title: `Search ${payload.q}`,
      message: (result as WebSearchResponse).pages.map((page, index) => `Result ${index + 1}\n${page.title}\n${page.url}\n${page.snippet}`).join("\n===\n"),
    });

    return result;
  };

  return proxy;
}

export async function webSearch(proxy: WebSearchProxy, payload: WebSearchPayload) {
  const result = await proxy(payload);
  return result;
}
