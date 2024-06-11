import type { ChatInput, ChatModelName, ChatOutput } from "@h20/server";
import type { ChatRequest } from "@h20/server/src/modules/openai/plexchat";
import { getAbortSignal } from "../copilot/abort";
import type { H20Proxy } from "../h20/proxy";

export type Chat = (request: ChatRequest) => Promise<ChatOutput>;
export type AbortChat = (handle: string) => void;

export interface SimpleModelConfig extends Partial<ChatInput> {
  models?: ChatModelName[];
}

export function getChat(h20Proxy: H20Proxy): Chat {
  const proxy: Chat = async (request) => {
    // reuse the task handle to abort network request
    // note that we still need to send the abort handle to the server to cancel any remote task
    const abortSignal = getAbortSignal(request.context?.abortHandle ?? "");
    return h20Proxy<ChatRequest, ChatOutput>("/openai/plexchat", request, { abortSignal });
  };

  return proxy;
}
