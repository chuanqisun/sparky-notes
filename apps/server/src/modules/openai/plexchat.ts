import type { RequestHandler } from "express";
import assert from "node:assert";
import { LogLevel, plexchat, type SimpleChatContext, type SimpleChatInput, type SimpleChatProxy, type SimpleEmbedProxy } from "plexchat";
import { devChatEndpointManifest } from "./plexchat-config";

let memoProxies: { chatProxy: SimpleChatProxy; embedProxy: SimpleEmbedProxy; abort: (abortHandle: string) => void } | null = null;

export type { ChatInput, ChatMessage, ChatOutput } from "plexchat";

export interface PlexChatRequest {
  input: SimpleChatInput;
  context?: SimpleChatContext;
}
export const plexChat: (chatProxy: SimpleChatProxy) => RequestHandler = (chatProxy) => {
  return async (req, res, next) => {
    try {
      const body = req.body as PlexChatRequest;
      assert(Array.isArray(body?.input?.messages), "Messages must be an array");
      const result = await chatProxy(req.body.input, req.body.context);
      res.json(result);
    } catch (e) {
      next(e);
    }
  };
};

export function loadOpenAIProxies() {
  if (memoProxies) return memoProxies;

  assert(process.env.HITS_OPENAI_DEV_API_KEY, "HITS_OPENAI_DEV_API_KEY is required");
  assert(process.env.HITS_OPENAI_DEV_ENDPOINT, "HITS_OPENAI_DEV_ENDPOINT is required");

  const { chatProxy, embedProxy, abort } = plexchat({
    manifests: [devChatEndpointManifest(process.env.HITS_OPENAI_DEV_ENDPOINT, process.env.HITS_OPENAI_DEV_API_KEY)],
    logLevel: LogLevel.Info,
  });

  memoProxies = { chatProxy, embedProxy, abort };
  return memoProxies;
}
