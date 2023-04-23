import { jsonProxy } from "../http/json-proxy";

import http from "http";
import https from "https";

export function cognitiveSearchJsonProxy<RequestType, ResponseType>(apiKey: string, endpoint: string) {
  return jsonProxy<RequestType, ResponseType>(endpoint, {
    axiosConfig: {
      headers: {
        "api-key": apiKey,
      },
      httpAgent: new http.Agent({ keepAlive: true, keepAliveMsecs: 10000, maxTotalSockets: 3, maxSockets: 3 }),
      httpsAgent: new https.Agent({ keepAlive: true, keepAliveMsecs: 10000, maxTotalSockets: 3, maxSockets: 3 }),
      timeout: 5000,
    },
    retryConfig: {
      retries: 3,
      retryDelay: (count) => {
        console.log(`Retry: ${count}`);
        return count * 2000;
      },
      shouldResetTimeout: true,
      retryCondition: () => true,
    },
  });
}

export interface CognitiveSearchInput {
  count?: boolean;
  filter?: string;
  highlightFields?: string;
  orderBy?: string;
  queryLanguage?: string;
  queryType?: "simple" | "full" | "semantic";
  search: string;
  searchFields?: string;
  select?: string;
  semanticConfiguration?: string;
  skip?: number;
  top?: number;
}

export interface CognitiveSearchOutput<DocumentType> {
  "@odata.count"?: number;
  "@search.nextPageParameters"?: {
    count: number;
  };
  "@odata.nextLink"?: string;
  value?: SearchResultItem<DocumentType>[];
}

export type SearchResultItem<DocumentType> = DocumentType & {
  "@search.score": number;
};
