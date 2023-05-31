import { isWithinTokenLimit } from "gpt-tokenizer";
import http from "http";
import https from "https";
import { jsonProxy } from "../http/json-proxy";
import { rateLimitQueue, withAsyncQueue } from "../http/rate-limit";

export interface SimpleChatProxy {
  (input: SimpleChatInput): Promise<ChatOutput>;
}

export type ChatModel = "v3.5-turbo" | "v4-8k" | "v4-32k";

export type SimpleChatInput = Partial<ChatInput> & Pick<ChatInput, "messages">;

export function getLengthSensitiveChatProxy(shortProxy: SimpleChatProxy, longProxy: SimpleChatProxy, threshold: number): SimpleChatProxy {
  const lengthSensitiveProxy: SimpleChatProxy = async (input) => {
    const { messages } = input;
    const isShort = isWithinTokenLimit(messages.map((m) => m.content).join("\n"), threshold);
    console.log("Proxy selected: ", isShort ? "short" : "long");
    const proxy = isShort ? shortProxy : longProxy;
    return proxy(input);
  };

  return lengthSensitiveProxy;
}

export function getLoadBalancedChatProxyV2(...proxies: SimpleChatProxy[]): SimpleChatProxy {
  let currentProxy = 0;

  const balancedProxy: SimpleChatProxy = async (input) => {
    const proxy = proxies[currentProxy];
    currentProxy = (currentProxy + 1) % proxies.length;
    return proxy(input);
  };

  return balancedProxy;
}

export function getLoadBalancedChatProxy(apiKey: string, models: ChatModel[], slient?: boolean): SimpleChatProxy {
  const internalProxies = models.map((model) => getSimpleChatProxy(apiKey, model, slient));

  let currentProxy = 0;

  const balancedProxy: SimpleChatProxy = async (input) => {
    const proxy = internalProxies[currentProxy];
    currentProxy = (currentProxy + 1) % internalProxies.length;
    return proxy(input);
  };

  return balancedProxy;
}

export function getSimpleChatProxy(apiKey: string, model?: ChatModel, silent?: boolean): SimpleChatProxy {
  const selectedModel = model ?? "v3.5-turbo";
  if (!silent) console.log("Model selection", selectedModel);
  const maxRequestsPerMiniute = modelToRequestsPerMinute(selectedModel);
  if (!silent) console.log("Model max rpm", maxRequestsPerMiniute);
  const endpoint = modelToEndpoint(selectedModel);
  if (!silent) console.log("Model endpoint", endpoint);

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
    const fullProxy = getChatProxy(apiKey, modelToEndpoint(selectedModel));
    return fullProxy(fullInput);
  };

  const queue = rateLimitQueue(maxRequestsPerMiniute, 0.1);
  const rateLimitedProxy = withAsyncQueue(queue, simpleProxy);
  return rateLimitedProxy;
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

export function modelToRequestsPerMinute(model?: ChatModel): number {
  switch (model) {
    case "v4-32k":
      return 1000;
    case "v4-8k":
      return 1000;
    case "v3.5-turbo":
    default:
      return 3000;
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
      timeout: 300000, // 5 minutes
    },
    retryConfig: {
      retries: 3,
      retryDelay: (count, error) => {
        const serverInternal = (((error.response?.data as any)?.error?.message as string) ?? "").match(/ (\d+) second/)?.[1];
        if (serverInternal) {
          const interval = parseInt(serverInternal) * 1000;
          console.log(`Retry: ${count} (server internal: ${interval / 1000})`);
          return interval;
        } else {
          const interval = count * 2000;
          console.log(`Retry: ${count}, (default internal: ${interval / 1000})}`);
          return interval;
        }
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
