import { GenericLogData } from "@impromptu-demo/types";
import { Logger } from "../utils/logger";

export interface ArxivSearchPayload {
  q: string;
  limit: number;
}

export type ArxivSearchResponse = {
  entries: {
    title: string;
    summary: string;
    url: string;
  }[];
};

export type ArxivSearchProxy = (payload: ArxivSearchPayload) => Promise<ArxivSearchResponse>;

export function getArxivSearchProxy(accessToken: string, logger: Logger): ArxivSearchProxy {
  const proxy = async (payload: ArxivSearchPayload) => {
    const result = await fetch(process.env.VITE_ARXIV_SEARCH_ENDPOINT!, {
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json());

    logger?.log<GenericLogData>({
      title: `Arxiv "${payload.q}"`,
      message: (result as ArxivSearchResponse).entries
        .map((entry, index) => `Result ${index + 1}\n${entry.title}\n${entry.url}\n${entry.summary}`)
        .join("\n\n===\n\n"),
    });

    return result;
  };

  return proxy;
}

export async function arxivSearch(proxy: ArxivSearchProxy, payload: ArxivSearchPayload) {
  const result = await proxy(payload);
  return result;
}
