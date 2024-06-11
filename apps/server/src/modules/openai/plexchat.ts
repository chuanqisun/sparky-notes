import type { RequestHandler } from "express";
import { LogLevel, plexchat, type SimpleChatContext, type SimpleChatInput, type SimpleChatProxy, type SimpleEmbedProxy } from "plexchat";
import { devChatEndpointManifest } from "./plexchat-config";

let memoProxies: { chatProxy: SimpleChatProxy; embedProxy: SimpleEmbedProxy; abort: (abortHandle: string) => void } | null = null;

export type { ChatInput, ChatInputMessage, ChatOutput } from "plexchat";

export interface ChatRequest {
  input: SimpleChatInput;
  context?: SimpleChatContext;
  signal?: AbortSignal;
}
export const chatRoute: (chatProxy: SimpleChatProxy, aborter: (abortHandle: string) => void) => RequestHandler = (chatProxy, aborter) => {
  return async (req, res, next) => {
    try {
      const abortHandle = crypto.randomUUID();
      const body = req.body as ChatRequest;
      assert(Array.isArray(body?.input?.messages), "Messages must be an array");
      const resultAsync = chatProxy(req.body.input, {
        models: body.context?.models,
        abortHandle,
      });

      req.socket.once("close", () => {
        aborter(abortHandle);
      });

      req.once("close", () => {
        aborter(abortHandle);
      });

      res.json(await resultAsync);
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

function assert(condition: any, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
