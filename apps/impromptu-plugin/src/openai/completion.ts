import { throttle } from "../utils/throttle";

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

export function getCompletionProxy(accessToken: string): CompletionProxy {
  const rawProxy = async (payload: OpenAICompletionPayload) => {
    const result = await fetch(process.env.VITE_OPENAI_COMPLETION_ENDPOINT!, {
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json());

    return result;
  };

  // see rate limit: https://learn.microsoft.com/en-us/azure/cognitive-services/openai/quotas-limits
  const throttledProxy = throttle(rawProxy, 600);
  return throttledProxy;
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
  console.log(prompt);
  console.log(result.choices[0].text);

  return result;
}
