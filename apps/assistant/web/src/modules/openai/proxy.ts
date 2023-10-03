import type { ChatInput, ChatMessage, ChatOutput, PlexChatInput, PlexChatModels, PlexChatOutput } from "@h20/server";
import type { H20Proxy } from "../h20/proxy";

export type RawProxy = (messages: ChatMessage[], modelConfig?: SimpleModelConfig) => Promise<ChatOutput>;
export type ChatProxy = (messages: ChatMessage[], modelConfig?: SimpleModelConfig) => Promise<string>;
export type FnCallProxy = (messages: ChatMessage[], modelConfig?: SimpleModelConfig) => Promise<{ arguments: string; name: string }>;

export interface SimpleModelConfig extends Partial<ChatInput> {
  models?: PlexChatModels[];
}

export function getChatProxy(h20Proxy: H20Proxy): ChatProxy {
  const proxy: ChatProxy = async (messages, modelConfig) => {
    const payload: PlexChatInput = {
      temperature: 0,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: 60,
      stop: null,
      models: ["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-3.5-turbo-textonly", "gpt-3.5-turbo-16k", "gpt-4", "gpt-4-32k"],
      messages,
      ...modelConfig,
    };

    const rawResult = await h20Proxy<PlexChatInput, PlexChatOutput>("/openai/plexchat", payload);

    return rawResult.choices[0].message.content ?? "";
  };

  return proxy;
}

export function getFnCallProxy(h20Proxy: H20Proxy): FnCallProxy {
  const proxy: FnCallProxy = async (messages, modelConfig) => {
    const payload: PlexChatInput = {
      temperature: 0,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: 60,
      stop: null,
      models: ["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4", "gpt-4-32k"],
      messages,
      ...modelConfig,
    };

    const rawResult = await h20Proxy<PlexChatInput, PlexChatOutput>("/openai/plexchat", payload);
    if (rawResult.choices[0].finish_reason !== "stop") throw new Error("Abnormal finish reason");

    return rawResult.choices[0].message.function_call!;
  };

  return proxy;
}
