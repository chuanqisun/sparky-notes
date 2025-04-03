/// <reference lib="WebWorker" />

import { formatDisplayNode } from "./modules/display/display-node";
import { getH20Proxy } from "./modules/h20/proxy";
import type { SearchOutput } from "./modules/hits/hits";
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
  const proxy = getH20Proxy(req.accessToken);

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
  const proxy = getH20Proxy(req.accessToken);

  const response = await proxy<any, SearchOutput>(
    "/hits/api/search/index",
    getSearchPayloadV2({ query: req.query, count: false, top: req.top, skip: req.skip, filter: {} })
  );

  // if user is directly matching the id of a report, we want render its children unconditionally
  const nodes = response.results.map((result) => formatDisplayNode(result, { renderAllChildren: result.document.id === req.query }));

  return {
    nodes,
    skip: req.skip,
    hasMore: nodes.length === req.top,
  };
};

const handleRecentV2: WorkerRoutes["recent"] = async ({ req }) => {
  const proxy = getH20Proxy(req.accessToken);

  const response = await proxy<any, SearchOutput>(
    "/hits/api/search/index",
    getSearchPayloadV2({ query: "*", count: false, top: req.top, skip: req.skip, filter: {}, orderBy: getOrderBy(getOrderByPublishDateClause()) })
  );
  const nodes = response.results.map((result) => formatDisplayNode(result));

  return {
    nodes: nodes,
    skip: req.skip,
    hasMore: nodes.length === req.top,
  };
};

main();
