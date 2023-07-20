import type { ChatProxy } from "../scheduler/worker";
import type { ChatInput, ChatOutput } from "./types";

export interface ProxyConfig {
  apiKey: string;
  endpoint: string;
}
export function getOpenAIJsonProxy({ apiKey, endpoint }: ProxyConfig): ChatProxy {
  return async (input: ChatInput, signal?: AbortSignal) => {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify(input),
        signal,
      });
    } catch (e) {
      // fetch or abort error
      return {
        error: `${(e as any)?.message}`,
      };
    }

    if (!response.ok) {
      let cooldown: number;
      let errorText: string;
      try {
        const { error } = (await response.json()) as { error: { code: string; message: string } };
        errorText = `${error?.code} ${error?.message ?? "Unknown API error"}`.trim();

        if (response.status === 429) {
          const cooldownText = errorText.match(/(\d+) seconds/)?.[1];
          cooldown = cooldownText ? parseInt(cooldownText) * 1000 : 30_000;
        }
      } catch (e) {
        errorText = `${(e as any)?.message}`;
      } finally {
        return {
          error: errorText!,
        };
      }
    }

    try {
      const result = (await response.json()) as ChatOutput;
      if (!Array.isArray(result.choices)) throw new Error("Invalid response from OpenAI API");
      return {
        data: result,
      };
    } catch (e) {
      return {
        error: `${(e as any)?.message}`,
      };
    }
  };
}
