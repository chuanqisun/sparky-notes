import type { ChatInput, ChatModelName, ChatOutput } from "@h20/server";
import type { PlexChatRequest } from "@h20/server/src/modules/openai/plexchat";
import type { H20Proxy } from "../h20/proxy";

export type PlexChatProxy = (request: PlexChatRequest) => Promise<ChatOutput>;

export interface SimpleModelConfig extends Partial<ChatInput> {
  models?: ChatModelName[];
}

export function getChatProxy(h20Proxy: H20Proxy): PlexChatProxy {
  const proxy: PlexChatProxy = async (request) => {
    return h20Proxy<PlexChatRequest, ChatOutput>("/openai/plexchat", request);
  };

  return proxy;
}
