import type { ChatOutput, SimpleChatContext, SimpleChatInput } from "plexchat";
import { useCallback, useMemo } from "preact/hooks";

export function useMaxProxy(options: { accessToken: string }) {
  const proxy = useCallback(
    async <T, K>(endpoint: string, payload: T, init?: Partial<RequestInit>) => {
      const result = await fetch(`${import.meta.env.VITE_MAX_SERVER_HOST!}${endpoint}`, {
        ...init,
        method: "post",
        headers: {
          ...init?.headers,
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.accessToken}`,
        },
        body: JSON.stringify(payload),
      }).then((res) => res.json());

      return result as K;
    },
    [options.accessToken]
  );

  const chatCompletions = useMemo(
    () => (payload: SimpleChatInput, context?: Pick<SimpleChatContext, "models">) =>
      proxy<SimpleChatInput, ChatOutput>("/chat/completions", payload, {
        headers: context?.models ? { "mx-models": context?.models?.join(",") } : {},
      }),
    [proxy]
  );

  return {
    chatCompletions,
  };
}
