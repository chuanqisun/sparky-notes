/// <reference lib="WebWorker" />

import type { Document as FlexDocument } from "flexsearch";
import { createFtsIndex, exportFtsIndex, importFtsIndex, IndexedItem, queryFts } from "./modules/fts/fts";
import { getDb } from "./modules/graph/db";
import { clearAllNodes, clearAllStores, exportNodes, getLastSyncRecord, getNodes, putNodes, updateSyncRecord } from "./modules/graph/graph";
import { graphNodeToFtsDocument, searchResultDocumentToGraphNode } from "./modules/hits/adaptor";
import { getAccessToken } from "./modules/hits/auth";
import type { HitsGraphNode } from "./modules/hits/hits";
import { getAuthenticatedProxy } from "./modules/hits/proxy";
import { search } from "./modules/hits/search";
import type { WorkerEvents, WorkerRoutes } from "./routes";
import { WorkerServer } from "./utils/worker-rpc";

declare const self: SharedWorkerGlobalScope | DedicatedWorkerGlobalScope;

let activeIndex: FlexDocument<IndexedItem> | undefined = undefined;

async function main() {
  const worker = new WorkerServer<WorkerRoutes, WorkerEvents>(self)
    .onRequest("echo", handleEcho)
    .onRequest("fullSync", handleFullSync)
    .onRequest("incSync", handleIncSync)
    .onRequest("search", handleSearch)
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

  const summary = await search({
    proxy,
    pageSize: 100,
    filter: {
      publishDateNewerThan: lastSync.latestUpdatedOn.toISOString(),
    },
    onProgress: async (progress) => {
      const graphNodes = searchResultDocumentToGraphNode(progress.items.map((item) => item.document));
      await putNodes(await db, graphNodes);
      emit("syncProgressed", progress);
    },
  });

  emit("syncCompleted", summary);
  emit("installed", "success");

  const draftIndex = createFtsIndex();
  await exportNodes(await db, (exportNodeData) => draftIndex.add(graphNodeToFtsDocument(exportNodeData.node as HitsGraphNode)));
  activeIndex = draftIndex;
  emit("indexChanged", "built");

  const exportedIndex = await exportFtsIndex(draftIndex);
  updateSyncRecord(await db, new Date(), exportedIndex);
};

const handleFullSync: WorkerRoutes["fullSync"] = async ({ req, emit }) => {
  const config = req.config;
  const db = getDb();
  const accessToken = await getAccessToken({ ...config, id_token: config.idToken });
  const proxy = getAuthenticatedProxy(accessToken);

  await clearAllNodes(await db);

  const summary = await search({
    proxy,
    pageSize: 200, // use larger page size for full sync
    filter: {},
    onProgress: async (progress) => {
      const graphNodes = searchResultDocumentToGraphNode(progress.items.map((item) => item.document));
      await putNodes(await db, graphNodes);
      emit("syncProgressed", progress);
    },
  });

  emit("syncCompleted", summary);

  const draftIndex = createFtsIndex();
  await exportNodes(await db, (exportNodeData) => draftIndex.add(graphNodeToFtsDocument(exportNodeData.node as HitsGraphNode)));
  activeIndex = draftIndex;
  emit("indexChanged", "built");

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

  return {
    nodes,
  };
};

main();
