/// <reference lib="WebWorker" />

import type { Document as FlexDocument } from "flexsearch";
import { createFtsIndex, exportFtsIndex, getTokens, getTokensPattern, hitsGraphNodeToFtsNode, importFtsIndex, IndexedItem, queryFts } from "./modules/fts/fts";
import { getDb } from "./modules/graph/db";
import { clearAllNodes, clearAllStores, exportAllNodes, getLastSyncRecord, getNodes, getRecentNodes, putNodes, updateSyncRecord } from "./modules/graph/graph";
import { graphNodeToFtsDocument, searchResultDocumentToGraphNode } from "./modules/hits/adaptor";
import { getAccessToken } from "./modules/hits/auth";
import type { HitsGraphNode } from "./modules/hits/hits";
import { getAuthenticatedProxy } from "./modules/hits/proxy";
import { search } from "./modules/hits/search";
import type { WorkerEvents, WorkerRoutes } from "./routes";
import { batchScheduler } from "./utils/batch-scheduler";
import { identity } from "./utils/identity";
import { WorkerServer } from "./utils/worker-rpc";

declare const self: SharedWorkerGlobalScope | DedicatedWorkerGlobalScope;

let activeIndex: FlexDocument<IndexedItem> | undefined = undefined;

async function main() {
  const worker = new WorkerServer<WorkerRoutes, WorkerEvents>(self)
    .onRequest("echo", handleEcho)
    .onRequest("fullSync", handleFullSync)
    .onRequest("incSync", handleIncSync)
    .onRequest("search", handleSearch)
    .onRequest("recent", handleRecent)
    .onRequest("uninstall", handleUninstall)
    .start();

  getDb()
    .then(getLastSyncRecord)
    .then((syncRecord) => (syncRecord ? importFtsIndex(syncRecord.exportedIndex) : createFtsIndex()))
    .then((initialIndex) => {
      activeIndex = initialIndex;
      worker.emit("indexChanged", "imported");
    });
}

const handleEcho: WorkerRoutes["echo"] = async ({ req }) => ({ message: req.message });

const handleIncSync: WorkerRoutes["incSync"] = async ({ req, emit }) => {
  const config = req.config;
  const db = getDb();
  const accessToken = await getAccessToken({ ...config, id_token: config.idToken });
  const proxy = getAuthenticatedProxy(accessToken);

  const lastSync = await getLastSyncRecord(await db);
  if (!lastSync) {
    emit("requestInstallation");
    return;
  }
  emit("installed", "success");

  const draftIndex = createFtsIndex();

  // Start indexing existing content before checking updates
  // Start from newest and cursor towards to oldest to prevent overlap with newly downloaded content
  let existingIndexed = 0;
  let existingTotal = 0;

  let newIndexed = 0;
  let newTotal = 0;

  let silentReindex = false;

  const existingContentIndexTask = exportAllNodes(await db).then((allNodes) => {
    existingTotal = allNodes.length;

    return batchScheduler(50, existingTotal, (i, isBoundary, isEnd) => {
      draftIndex.add(graphNodeToFtsDocument(allNodes[i] as HitsGraphNode));
      if (silentReindex) return;
      if (isBoundary || isEnd) {
        existingIndexed = i;
        emit("incSyncProgressed", { newTotal, existingTotal, newIndexed, existingIndexed });
      }
    });
  });

  const summary = await search({
    proxy,
    pageSize: 100,
    filter: {
      publishDateNewerThan: lastSync.latestUpdatedOn.toISOString(),
    },
    onProgress: async (progress) => {
      const graphNodes = searchResultDocumentToGraphNode(progress.items.map((item) => item.document));
      await putNodes(await db, graphNodes);

      graphNodes.forEach((node) => {
        draftIndex.add(graphNodeToFtsDocument(node));

        if (progress.success % 50 === 0 || progress.success === progress.total) {
          newIndexed = progress.success;
          newTotal = progress.total;
          emit("incSyncProgressed", { newTotal, newIndexed, existingTotal, existingIndexed });
        }
      });
    },
  });

  // no updates, consider complete even though we are still reindexing in the background
  if (!summary.total) {
    emit("incSyncProgressed", { newTotal, newIndexed, existingTotal, existingIndexed: existingTotal });
    silentReindex = true;
  }

  summary.hasError && emit("syncFailed");

  await existingContentIndexTask;

  activeIndex = draftIndex;
  emit("indexChanged", "builtFromIncSync");

  const exportedIndex = await exportFtsIndex(draftIndex);
  updateSyncRecord(await db, new Date(), exportedIndex);
};

const handleFullSync: WorkerRoutes["fullSync"] = async ({ req, emit }) => {
  const config = req.config;
  const db = getDb();
  const accessToken = await getAccessToken({ ...config, id_token: config.idToken });
  const proxy = getAuthenticatedProxy(accessToken);
  const draftIndex = createFtsIndex();

  let indexSuccess = 0;

  await clearAllNodes(await db);

  const summary = await search({
    proxy,
    pageSize: 200, // use larger page size for full sync
    filter: {},
    onProgress: async (progress) => {
      const graphNodes = searchResultDocumentToGraphNode(progress.items.map((item) => item.document));
      await putNodes(await db, graphNodes);

      graphNodes.forEach((node) => {
        draftIndex.add(graphNodeToFtsDocument(node));
        indexSuccess++;
        if (indexSuccess % 50 === 0 || indexSuccess === progress.total) {
          emit("fullSyncProgressed", { ...progress, success: indexSuccess });
        }
      });
    },
  });

  summary.hasError && emit("syncFailed");

  activeIndex = draftIndex;
  emit("indexChanged", "builtFromFullSync");

  const exportedIndex = await exportFtsIndex(draftIndex);
  updateSyncRecord(await db, new Date(), exportedIndex);

  summary.hasError ? emit("installed", "failed") : emit("installed", "success");
};

const handleUninstall: WorkerRoutes["uninstall"] = async ({ req, emit }) => {
  const db = getDb();
  await clearAllStores(await db);
  emit("uninstalled");
};

const handleSearch: WorkerRoutes["search"] = async ({ req }) => {
  const db = getDb();
  const ids = (await queryFts(activeIndex!, req.query)) as string[];
  // TODO memoize getNodes
  const nodes = await getNodes<HitsGraphNode>(await db, ids);

  const pattern = getTokensPattern(getTokens(req.query));
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

const handleRecent: WorkerRoutes["recent"] = async ({ req }) => {
  const db = getDb();
  const nodes = await getRecentNodes<HitsGraphNode>(await db);
  const ftsNodes = nodes.map((node) => hitsGraphNodeToFtsNode(identity, node));

  return {
    nodes: ftsNodes,
  };
};

main();
