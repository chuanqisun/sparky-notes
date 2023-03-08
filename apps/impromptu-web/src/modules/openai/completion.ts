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

export function getCompletionProxy(endpoint: string, apiKey: string): CompletionProxy {
  return async (payload: OpenAICompletionPayload) => {
    const result = await fetch(endpoint, {
      method: "post",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json());

    return result;
  };
}

export async function getCompletion(proxy: CompletionProxy, prompt: string, config?: Partial<OpenAICompletionPayload>) {
  console.log("[completion]", prompt);
  return proxy({
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
}
