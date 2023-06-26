import type { ChatProxy } from "../../account/model-selector";
import { jsAutoPromptV2 } from "../../jq/js-auto-prompt-v2";
import type { ChatMessage } from "../../openai/chat";
import type { ShelfDirective } from "./base-directive";

export function createCodeDirective(chat: ChatProxy): ShelfDirective {
  return {
    match: (source) => source.startsWith("/code"),
    run: async ({ source, data }) => {
      const codePlan = source.slice("/code".length).trim();
      const output = await jsAutoPromptV2({
        input: data,
        onGetChat: (messages: ChatMessage[]) => chat(messages, { max_tokens: 1200, temperature: 0 }),
        onGetUserMessage: ({ lastError }) =>
          lastError ? `The previous function call failed with error: ${lastError}. Try a different query` : `Goal: ${codePlan}`,
      });

      return {
        data: output,
      };
    },
  };
}
