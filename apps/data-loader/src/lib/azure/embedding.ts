import { jsonProxy } from "../http/json-proxy";

import http from "http";
import https from "https";

export function getEmbeddingProxy(apiKey: string, endpoint: string) {
  return jsonProxy<EmbeddingInput, EmbeddingOutput>(endpoint, {
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

export interface EmbeddingInput {
  input: string;
}

export interface EmbeddingOutput {
  object: "string";
  model: "string";
  data: [
    {
      index: number;
      object: "embedding";
      embedding: number[];
    }
  ];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
