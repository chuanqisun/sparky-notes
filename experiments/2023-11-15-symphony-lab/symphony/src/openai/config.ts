import type { ChatInput } from "@h20/plex-chat";

export const defaultModelConfig = {
  temperature: 0,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
  max_tokens: 60,
  stop: "",
} satisfies Partial<ChatInput>;

export const defaultModels = ["gpt-35-turbo", "gpt-35-turbo-16k", "gpt-4", "gpt-4-32k"];
