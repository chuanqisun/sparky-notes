/// <reference lib="WebWorker" />

import { getTokens, getTokensPattern, hitsGraphNodeToFtsNode } from "./modules/fts/fts";
import { getHighlightDict, isClaimType, searchResultChildToHitsGraphChild, searchResultsDisplayNodes } from "./modules/hits/adaptor";
import { getAuthenticatedProxy } from "./modules/hits/proxy";
import { getSearchPayloadV2, searchFirst } from "./modules/hits/search";
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

  const pattern = getTokensPattern(getTokens(req.query));
  const results = await proxy(getSearchPayloadV2({ query: req.query, count: false, top: req.top, skip: req.skip, filter: {} }));

  const nodes = searchResultsDisplayNodes(results.results, (item) => {
    const dict = getHighlightDict(item.highlights?.["children/Title"] ?? []);
    const hasHighlight = (text: string) => dict.some((entry) => entry[0].toLocaleLowerCase() === text.toLocaleLowerCase());
    return item.document.children
      .filter(isClaimType)
      .filter((child) => hasHighlight(child.title ?? ""))
      .map(searchResultChildToHitsGraphChild);
  });

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
    skip: req.skip,
    hasMore: ftsNodes.length === req.top,
  };
};

const handleRecentV2: WorkerRoutes["recent"] = async ({ req }) => {
  const proxy = getAuthenticatedProxy(req.accessToken);
  const results = await proxy(getSearchPayloadV2({ query: "*", count: false, top: req.top, skip: req.skip, filter: {} }));
  const nodes = searchResultsDisplayNodes(
    results.results,
    () => [] // omit children
  );

  const ftsNodes = nodes.map((node) => hitsGraphNodeToFtsNode(identity, node));

  return {
    nodes: ftsNodes,
    skip: req.skip,
    hasMore: ftsNodes.length === req.top,
  };
};

main();
