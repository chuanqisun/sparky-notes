import type { RequestHandler } from "express";
import assert from "node:assert";
import { LogLevel, plexchat, type SimpleChatInput, type SimpleChatProxy, type SimpleEmbedProxy } from "plexchat";
import { devChatEndpointManifest, prodChatEndpointManifest } from "../../plexchat-config";

let memoProxies: { chatProxy: SimpleChatProxy; embedProxy: SimpleEmbedProxy } | null = null;

export type { ChatInput, ChatMessage, ChatOutput } from "@h20/plex-chat";

const { chatProxy } = loadOpenAIProxies();

export const plexChat: (chatProxy: SimpleChatProxy) => RequestHandler = () => {
  return async (req, res, next) => {
    try {
      const body = req.body as SimpleChatInput;
      assert(Array.isArray(body.messages), "Messages must be an array");
      assert(Array.isArray(body.models), "Models must be an array");
      const result = await chatProxy(body);
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
  assert(process.env.HITS_OPENAI_PROD_API_KEY, "HITS_OPENAI_PROD_API_KEY is required");
  assert(process.env.HITS_OPENAI_PROD_ENDPOINT, "HITS_OPENAI_PROD_ENDPOINT is required");

  const { chatProxy, embedProxy } = plexchat({
    manifests: [
      devChatEndpointManifest(process.env.HITS_OPENAI_DEV_ENDPOINT, process.env.HITS_OPENAI_DEV_API_KEY),
      prodChatEndpointManifest(process.env.HITS_OPENAI_PROD_ENDPOINT, process.env.HITS_OPENAI_PROD_API_KEY),
    ],
    logLevel: LogLevel.Warn,
  });

  memoProxies = { chatProxy, embedProxy };
  return memoProxies;
}
