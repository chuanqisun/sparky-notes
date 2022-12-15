/// <reference lib="WebWorker" />

import { formatDisplayNode } from "./modules/hits/display-node";
import { getAuthenticatedProxy } from "./modules/hits/proxy";
import { getOrderBy, getOrderByPublishDateClause, getSearchPayloadV2, searchFirst } from "./modules/hits/search";
import type { WorkerEvents, WorkerRoutes } from "./routes";
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
  const proxy = getAuthenticatedProxy(req.accessToken);

  performance.mark("start");
  try {
    const result = await searchFirst({
      proxy,
      filter: {
        entityId: req.entityId,
        entityType: req.entityType,
      },
    });
    console.log(`[get-card-data] ${(performance.measure("duration", "start").duration / 1000).toFixed(2)}ms`, result);

    return { cardData: result?.document ?? null };
  } catch {
    return { cardData: null };
  }
};

const handleLiveSearch: WorkerRoutes["search"] = async ({ req, emit }) => {
  const proxy = getAuthenticatedProxy(req.accessToken);

  const response = await proxy(getSearchPayloadV2({ query: req.query, count: false, top: req.top, skip: req.skip, filter: {} }));
  const nodes = response.results.map(formatDisplayNode);

  return {
    nodes,
    skip: req.skip,
    hasMore: nodes.length === req.top,
  };
};

const handleRecentV2: WorkerRoutes["recent"] = async ({ req }) => {
  const proxy = getAuthenticatedProxy(req.accessToken);

  const response = await proxy(
    getSearchPayloadV2({ query: "*", count: false, top: req.top, skip: req.skip, filter: {}, orderBy: getOrderBy(getOrderByPublishDateClause()) })
  );
  const nodes = response.results.map(formatDisplayNode);

  return {
    nodes: nodes,
    skip: req.skip,
    hasMore: nodes.length === req.top,
  };
};

main();
