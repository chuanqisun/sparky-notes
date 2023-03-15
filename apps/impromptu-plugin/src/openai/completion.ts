export interface OpenAICompletionPayload {
  prompt: string;
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  best_of: number;
  max_tokens: number;
  stop: string | string[];
}

export type OpenAICompletionResponse = {
  choices: {
    text: string;
  }[];
  usage: {
    total_tokens: number;
  };
};

export type CompletionProxy = (payload: OpenAICompletionPayload) => Promise<OpenAICompletionResponse>;

export interface CompletionLogger {
  info: (item: CompletionInfoItem) => void;
  error: (item: CompletionErrorItem) => void;
}

export interface CompletionInfoItem {
  id: number;
  timestamp: number;
  prompt: string;
  completion: string;
  tokenUsage: number;
}

export interface CompletionErrorItem {
  id: number;
  timestamp: number;
  prompt: string;
  error: string;
}

let currentId = 0;

export function getCompletionProxy(accessToken: string, logger?: CompletionLogger): CompletionProxy {
  const proxy = async (payload: OpenAICompletionPayload) => {
    if (++currentId === Number.MAX_SAFE_INTEGER) {
      currentId = 1;
    }

    try {
      const result = await fetch(process.env.VITE_OPENAI_COMPLETION_ENDPOINT!, {
        method: "post",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then((res) => res.json());

      logger?.info({ id: currentId, timestamp: Date.now(), prompt: payload.prompt, completion: result.choices[0].text, tokenUsage: result.usage.total_tokens });

      return result;
    } catch (e) {
      logger?.error({ id: currentId, timestamp: Date.now(), prompt: payload.prompt, error: `${(e as Error).name} ${(e as Error).message}` });
      throw e;
    }
  };

  return proxy;
}

export async function getCompletion(proxy: CompletionProxy, prompt: string, config?: Partial<OpenAICompletionPayload>) {
  const result = await proxy({
    prompt,
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    best_of: 1,
    max_tokens: 60,
    stop: "",
    ...config,
  });

  return result;
}
