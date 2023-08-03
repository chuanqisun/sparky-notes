import { ChatManager, ChatWorker, getOpenAIWorkerProxy } from "@h20/plex-chat";
import { getTimeoutFunction } from "@h20/plex-chat/src/controller/timeout";
import { LogLevel } from "@h20/plex-chat/src/scheduler/logger";
import type { RequestHandler } from "express";

export interface PlexChatConfig {
  endpoints: PlexChatEndpoint[];
}

export interface PlexChatEndpoint {
  endpoint: string;
  apiKey: string;
  key: string;
  models: string[];
  rpm: number;
  tpm: number;
  minTimeoutMs: number;
  timeoutMsPerToken: number;
  concurrency: number;
  contextWindow: number;
}

export const chat: (config: PlexChatConfig) => RequestHandler = (config: PlexChatConfig) => {
  const workers = config.endpoints.map((endpoint) => {
    return new ChatWorker({
      proxy: getOpenAIWorkerProxy({
        apiKey: endpoint.apiKey,
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

  return async (req, res, next) => {};
};
