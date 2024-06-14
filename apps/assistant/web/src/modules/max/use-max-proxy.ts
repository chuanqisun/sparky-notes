import type { ChatOutput, ChatOutputStreamEvent, SimpleChatContext, SimpleChatInput, SimpleChatStreamInput } from "plexchat";
import { useCallback, useMemo } from "preact/hooks";

export type ChatCompletionProxy = (payload: SimpleChatInput, context?: Pick<SimpleChatContext, "models">, init?: Partial<RequestInit>) => Promise<ChatOutput>;

export type ChatCompletionStreamProxy = (
  payload: SimpleChatStreamInput,
  context?: Pick<SimpleChatContext, "models">,
  init?: Partial<RequestInit>
) => AsyncGenerator<ChatOutputStreamEvent, void, unknown>;

export function useMaxProxy(options: { accessToken: string }) {
  const proxy = useCallback(
    async <T>(endpoint: string, payload: T, init?: Partial<RequestInit>) => {
      const result = await fetch(`${import.meta.env.VITE_MAX_SERVER_HOST!}${endpoint}`, {
        ...init,
        method: "post",
        headers: {
          ...init?.headers,
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      return result;
    },
    [options.accessToken]
  );

  const chatCompletions = useMemo<ChatCompletionProxy>(
    () => (payload: SimpleChatInput, context?: Pick<SimpleChatContext, "models">, init?: Partial<RequestInit>) =>
      proxy<SimpleChatInput>("/chat/completions", payload, {
        ...init,
        headers: {
          ...init?.headers,
          ...(context?.models ? { "mx-models": context?.models?.join(",") } : {}),
        },
      }).then((res) => res.json() as Promise<ChatOutput>),
    [proxy]
  );

  const chatCompletionsStream = useMemo<ChatCompletionStreamProxy>(
    () =>
      async function* (payload: SimpleChatStreamInput, context?: Pick<SimpleChatContext, "models">, init?: Partial<RequestInit>) {
        const stream = await proxy<SimpleChatStreamInput>("/chat/completions", payload, {
          ...init,
          headers: {
            ...init?.headers,
            ...(context?.models ? { "mx-models": context?.models?.join(",") } : {}),
          },
        });

        if (!stream.ok) {
          throw new Error(`Request failed: ${[stream.status, stream.statusText, await stream.text()].join(" ")}`);
        }

        if (!stream.body) throw new Error("Request failed");

        const reader = stream.body.getReader();
        const decoder = new TextDecoder("utf-8");

        let unfinishedLine = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          // Massage and parse the chunk of data
          const chunk = decoder.decode(value);

          // because the packets can split anywhere, we only process whole lines
          const currentWindow = unfinishedLine + chunk;
          unfinishedLine = currentWindow.slice(currentWindow.lastIndexOf("\n") + 1);

          const wholeLines = currentWindow
            .slice(0, currentWindow.lastIndexOf("\n") + 1)
            .split("\n")
            .filter(Boolean);

          const matches = wholeLines.map((wholeLine) => [...wholeLine.matchAll(/^data: (\{.*\})$/g)][0]?.[1]).filter(Boolean);

          for (const match of matches) {
            const item = JSON.parse(match);
            if ((item as any)?.error?.message) throw new Error((item as any).error.message);
            if (!Array.isArray(item?.choices)) throw new Error("Invalid response");
            yield item;
          }
        }
      },
    [proxy]
  );

  return {
    chatCompletions,
    chatCompletionsStream,
  };
}
