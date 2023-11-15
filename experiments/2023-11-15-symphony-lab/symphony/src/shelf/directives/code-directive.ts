import { jsAutoPromptV3 } from "../../jq/js-auto-prompt-v3";
import type { ChatMessage, FnCallProxy, SimpleModelConfig } from "../../openai/chat";
import type { ShelfDirective } from "./base-directive";

export function createCodeDirective(chat: FnCallProxy): ShelfDirective {
  return {
    match: (source) => source.startsWith("/code"),
    run: async ({ source, data }) => {
      const codePlan = source.slice("/code".length).trim();
      const output = await jsAutoPromptV3({
        input: data,
        fnCallProxy: (messages: ChatMessage[], config?: SimpleModelConfig) =>
          chat(messages, { max_tokens: 2400, temperature: 0, ...config, models: ["gpt-35-turbo"] }),
        onGetUserMessage: ({ lastError }) =>
          lastError ? `The previous function call failed with error: ${lastError}. Try a different query` : `Goal: ${codePlan}`,
      });

      return {
        data: output,
      };
    },
  };
}
