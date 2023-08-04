import type { ChatInput } from "@h20/plex-chat";
import gptTokenizer from "gpt-tokenizer";

export function estimateChatTokenDemand(input: ChatInput): number {
  const inputDemand =
    gptTokenizer.encodeChat(input.messages, "gpt-3.5-turbo").length * 1.25 +
    (input?.function_call ? gptTokenizer.encode(JSON.stringify(input?.function_call)).length : 0);

  const outputDemand = input.max_tokens;

  return inputDemand + outputDemand;
}
