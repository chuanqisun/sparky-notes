/// <reference lib="WebWorker" />

import { getTokens, getTokensPattern, hitsGraphNodeToFtsNode } from "./modules/fts/fts";
import { searchResultDocumentToDisplayNode } from "./modules/hits/adaptor";
import { getAccessToken } from "./modules/hits/auth";
import { getAuthenticatedProxy } from "./modules/hits/proxy";
import { searchFirst, searchRecent, searchV2 } from "./modules/hits/search";
import type { WorkerEvents, WorkerRoutes } from "./routes";
import { identity } from "./utils/identity";
import { WorkerServer } from "./utils/worker-rpc";

declare const self: SharedWorkerGlobalScope | DedicatedWorkerGlobalScope;

async function main() {
  new WorkerServer<WorkerRoutes, WorkerEvents>(self)
    .onRequest("echo", handleEcho)
    .onRequest("getCardData", handleGetCardData)
    .onRequest("search", handleLiveSearch)
    .onRequest("recent", handleRecentV2)
    .start();
}

const handleEcho: WorkerRoutes["echo"] = async ({ req }) => ({ message: req.message });

const handleGetCardData: WorkerRoutes["getCardData"] = async ({ req }) => {
  const config = req.config;
  const accessToken = await getAccessToken({ ...config, id_token: config.idToken });
  const proxy = getAuthenticatedProxy(accessToken);

  performance.mark("start");
  const result = await searchFirst({
    proxy,
    filter: {
      entityId: req.entityId,
      entityType: req.entityType,
    },
  });
  console.log(`[get-card-data] ${(performance.measure("duration", "start").duration / 1000).toFixed(2)}ms`, result);

  return { cardData: result?.document ?? null };
};

const handleLiveSearch: WorkerRoutes["search"] = async ({ req, emit }) => {
  const config = req.config;
  const accessToken = await getAccessToken({ ...config, id_token: config.idToken });
  const proxy = getAuthenticatedProxy(accessToken);

  const pattern = getTokensPattern(getTokens(req.query));
  const results = await searchV2({ proxy, query: req.query, filter: {} });
  const nodes = searchResultDocumentToDisplayNode(results.results.map((result) => result.document));
  const highlighter = pattern
    ? (input: string, onMatch?: () => any) => {
        return input.replaceAll(pattern, (match) => {
          onMatch?.();
          return `<mark>${match}</mark>`;
        });
      }
    : identity;

  const ftsNodes = nodes.map((node) => hitsGraphNodeToFtsNode(highlighter, node));

  return {
    nodes: ftsNodes,
  };
};

const handleRecentV2: WorkerRoutes["recent"] = async ({ req }) => {
  const config = req.config;
  const accessToken = await getAccessToken({ ...config, id_token: config.idToken });
  const proxy = getAuthenticatedProxy(accessToken);

  const results = await searchRecent({ proxy, query: "*", filter: {} });
  const nodes = searchResultDocumentToDisplayNode(results.results.map((result) => result.document));

  const ftsNodes = nodes.map((node) => hitsGraphNodeToFtsNode(identity, node));

  return {
    nodes: ftsNodes,
  };
};

main();
