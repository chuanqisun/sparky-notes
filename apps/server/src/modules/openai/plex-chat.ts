import { ChatManager, ChatWorker, getOpenAIWorkerProxy, type ChatInput } from "@h20/plex-chat";
import { getTimeoutFunction } from "@h20/plex-chat/src/controller/timeout";
import { LogLevel } from "@h20/plex-chat/src/scheduler/logger";
import { assert } from "console";
import type { RequestHandler } from "express";
import { estimateChatTokenDemand } from "./tokens";

export interface PlexChatConfig {
  endpoints: PlexChatEndpoint[];
}

export interface PlexChatEndpoint {
  endpoint: string;
  key: string;
  models: PlexChatModels[];
  rpm: number;
  tpm: number;
  minTimeoutMs: number;
  timeoutMsPerToken: number;
  concurrency: number;
  contextWindow: number;
  fnCall?: boolean;
}

export type PlexChatModels = "gpt-3.5-turbo-textonly" | "gpt-3.5-turbo-16k-textonly" | "gpt-3.5-turbo" | "gpt-3.5-turbo-16k" | "gpt-4" | "gpt-4-32k";

export interface PlexChatInput extends ChatInput {
  models: PlexChatModels[];
}

export const plexChat: (config: PlexChatConfig) => RequestHandler = (config: PlexChatConfig) => {
  const workers = config.endpoints.map((endpoint) => {
    return new ChatWorker({
      proxy: getOpenAIWorkerProxy({
        apiKey: endpoint.key,
        endpoint: endpoint.endpoint,
      }),
      models: endpoint.models,
      concurrency: endpoint.concurrency,
      timeout: getTimeoutFunction(endpoint.minTimeoutMs, endpoint.timeoutMsPerToken),
      requestsPerMinute: endpoint.rpm,
      tokensPerMinute: endpoint.tpm,
      contextWindow: endpoint.contextWindow,
      logLevel: LogLevel.Warn,
    });
  });

  const chatManager = new ChatManager({ workers, logLevel: LogLevel.Info });

  return async (req, res, next) => {
    try {
      const body = req.body as PlexChatInput;
      assert(Array.isArray(body.messages), "Messages must be an array");
      assert(Array.isArray(body.models), "Models must be an array");

      const { models, ...input } = body;
      const tokenDemand = estimateChatTokenDemand(input);

      const result = await chatManager.submit({
        tokenDemand,
        models,
        input,
      });

      res.json(result);
    } catch (e) {
      next(e);
    }
  };
};
