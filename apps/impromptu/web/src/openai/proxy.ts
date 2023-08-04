import type { ChatInput, ChatMessage } from "@h20/plex-chat";

export type ChatProxy = (messages: ChatMessage[], modelConfig?: SimpleModelConfig) => Promise<string>;
export type FnCallProxy = (messages: ChatMessage[], modelConfig?: SimpleModelConfig) => Promise<{ arguments: string; name: string }>;

export interface SimpleModelConfig extends Partial<ChatInput> {
  models?: string[];
}
