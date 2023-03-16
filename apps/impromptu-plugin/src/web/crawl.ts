import { Logger } from "../utils/logger";

export interface WebCrawlPayload {
  url: string;
}

export interface WebCrawlResult {
  markdown: string;
  links: WebCrawlLink[];
}

export interface WebCrawlLink {
  title: string;
  href: string;
}

export type WebCrawlProxy = (payload: WebCrawlPayload) => Promise<WebCrawlResult>;

export function getWebCrawlProxy(accessToken: string, logger?: Logger): WebCrawlProxy {
  const proxy = async (payload: WebCrawlPayload) => {
    const result: WebCrawlResult = await fetch(process.env.VITE_WEB_CRAWL_ENDPOINT!, {
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json());

    logger?.log({
      title: `Crawl ${payload.url}`,
      message: [`${result.links.length} links\n${result.links.map((link) => `${link.title}\n${link.href}`).join("\n\n")}`, result.markdown].join("\n\n===\n\n"),
    });

    return result;
  };

  return proxy;
}

export async function webCrawl(proxy: WebCrawlProxy, payload: WebCrawlPayload) {
  const result = await proxy(payload);
  return result;
}
