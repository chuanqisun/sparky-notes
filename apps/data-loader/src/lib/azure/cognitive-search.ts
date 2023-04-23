import { jsonProxy } from "../http/json-proxy";

import http from "http";
import https from "https";

export function cognitiveSearchJsonProxy<RequestType, ResponseType>(apiKey: string, endpoint: string) {
  return jsonProxy<RequestType, ResponseType>({
    header: {
      "api-key": apiKey,
    },
    endpoint,
    httpAgent: new http.Agent({ keepAlive: true, keepAliveMsecs: 5000, maxTotalSockets: 20, maxSockets: 10 }),
    httpsAgent: new https.Agent({ keepAlive: true, keepAliveMsecs: 5000, maxTotalSockets: 20, maxSockets: 10 }),
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
