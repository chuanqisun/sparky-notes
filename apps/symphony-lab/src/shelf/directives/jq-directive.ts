import type { ChatProxy } from "../../account/model-selector";
import { jqAutoPrompt } from "../../jq/jq-auto-prompt";
import type { ChatMessage } from "../../openai/chat";
import type { ShelfDirective } from "./base-directive";

export function createJqDirective(chat: ChatProxy): ShelfDirective {
  return {
    match: (source) => source.startsWith("/jq"),
    run: async ({ source, data, updateData: setData, updateStatus: setStatus }) => {
      const jqPlan = source.slice("/jq".length).trim();
      const output = await jqAutoPrompt({
        input: data,
        onGetChat: (messages: ChatMessage[]) => chat(messages, { max_tokens: 1200, temperature: 0 }),
        onGetUserMessage: ({ lastError }) => (lastError ? `The previous query failed with error: ${lastError}. Try a different query` : jqPlan),
        onJqString: (jq) => setStatus(`jq: ${jq}`),
        onRetry: (error) => setStatus(`retry due to ${error}`),
      });

      return {
        data: output,
      };
    },
  };
}
