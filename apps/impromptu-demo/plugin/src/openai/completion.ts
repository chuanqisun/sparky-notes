import { CompletionErrorItem, CompletionInfoItem } from "@impromptu-demo/types";
import { Logger } from "../utils/logger";

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

export function getCompletionProxy(accessToken: string, logger?: Logger): CompletionProxy {
  const proxy = async (payload: OpenAICompletionPayload) => {
    try {
      const result = await fetch(process.env.VITE_OPENAI_COMPLETION_ENDPOINT!, {
        method: "post",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then((res) => res.json());

      logger?.log<CompletionInfoItem>({
        title: `Completion ${result.usage.total_tokens} tokens`,
        prompt: payload.prompt,
        completion: result.choices[0].text,
        tokenUsage: result.usage.total_tokens,
      });

      return result;
    } catch (e) {
      logger?.log<CompletionErrorItem>(
        {
          title: `Completion error`,
          prompt: payload.prompt,
          error: `${(e as Error).name} ${(e as Error).message}`,
        },
        "error"
      );
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
