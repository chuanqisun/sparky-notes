import { GenericLogData, Logger } from "../utils/logger";

export interface WebCrawlPayload {
  url: string;
}

export type WebCrawlResponse = {
  text: string;
};

export type WebCrawlProxy = (payload: WebCrawlPayload) => Promise<WebCrawlResponse>;

export function getWebCrawlProxy(accessToken: string, logger?: Logger): WebCrawlProxy {
  const proxy = async (payload: WebCrawlPayload) => {
    const result = await fetch(process.env.VITE_WEB_CRAWL_ENDPOINT!, {
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json());

    logger?.log<GenericLogData>({ title: `Crawl ${payload.url}`, message: (result as WebCrawlResponse).text });

    return result;
  };

  return proxy;
}

export async function webCrawl(proxy: WebCrawlProxy, payload: WebCrawlPayload) {
  const result = await proxy(payload);
  return result;
}
