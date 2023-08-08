import { jsInterpreter } from "../../jq/js-interpreter";
import type { ChatMessage, FnCallProxy, SimpleModelConfig } from "../../openai/chat";
import type { ShelfDirective } from "./base-directive";

/**
 * Note: GPT-3 is struggling with code authoring. Consider locking to GPT-4
 */
export function createRunDirective(fnCall: FnCallProxy): ShelfDirective {
  return {
    match: (source) => source.startsWith("/run"),
    run: async ({ source, data }) => {
      const goal = source.slice("/run".length).trim();
      const output = await jsInterpreter({
        data,
        goal,
        fnCallProxy: (messages: ChatMessage[], config?: SimpleModelConfig) =>
          fnCall(messages, { max_tokens: 2400, temperature: 0, ...config, models: ["gpt-35-turbo"] }),
      });

      return {
        data: output,
      };
    },
  };
}
