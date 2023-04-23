import { jsonProxy } from "../http/json-proxy";

import http from "http";
import https from "https";

export interface SimpleChatProxy {
  (input: SimpleChatInput): Promise<ChatOutput>;
}

export type ChatModel = "v3.5-turbo" | "v4-8k" | "v4-32k";

export type SimpleChatInput = Partial<ChatInput> &
  Pick<ChatInput, "messages"> & {
    /** @default "v3.5-turbo" */
    model?: ChatModel;
  };

export function getSimpleChatProxy(apiKey: string): SimpleChatProxy {
  const simpleProxy: SimpleChatProxy = async (input) => {
    const fullInput: ChatInput = {
      temperature: 0,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: 60,
      stop: "",
      ...input,
    };
    const fullProxy = getChatProxy(apiKey, modelToEndpoint(input.model ?? "v3.5-turbo"));
    return fullProxy(fullInput);
  };

  return simpleProxy;
}

export function modelToEndpoint(model?: ChatModel): string {
  switch (model) {
    case "v4-32k":
      return process.env.OPENAI_CHAT_ENDPOINT_V4_32K!;
    case "v4-8k":
      return process.env.OPENAI_CHAT_ENDPOINT_V4_8K!;
    case "v3.5-turbo":
    default:
      return process.env.OPENAI_CHAT_ENDPOINT!;
  }
}

export function getChatProxy(apiKey: string, endpoint: string) {
  return jsonProxy<ChatInput, ChatOutput>(endpoint, {
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
// ref: https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference
export interface ChatInput {
  messages: ChatMessage[];
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  max_tokens: number;
  stop: null | string | string[];
}

export interface ChatMessage {
  role: "assistant" | "system" | "user";
  content: string;
}

export type ChatOutput = {
  choices: {
    finish_reason: "stop" | "length" | "content_filter" | null;
    index: number;
    message: {
      content?: string; // blank when content_filter is active
      role: "assistant";
    };
  }[];
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
};
