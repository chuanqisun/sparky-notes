/// <reference lib="WebWorker" />

import type { Document as FlexDocument } from "flexsearch";
import { createFtsIndex, exportFtsIndex, importFtsIndex, IndexedItem } from "./modules/fts/fts";
import { getDb } from "./modules/graph-v2/db";
import { clearAllNodes, exportNodes, getLastSyncRecord, putNode, updateSyncRecord } from "./modules/graph-v2/graph";
import { graphNodeToFtsDocument, searchResultDocumentToGraphNode } from "./modules/hits/adaptor";
import { getAccessToken } from "./modules/hits/auth";
import { EntityType } from "./modules/hits/entity";
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
    .onRequest("search", handleSearch)
    .start();

  getDb()
    .then(getLastSyncRecord)
    .then((syncRecord) => (syncRecord ? importFtsIndex(syncRecord.exportedIndex) : createFtsIndex()))
    .then((initialIndex) => {
      activeIndex = initialIndex;
      console.log("emitting indexChanged");
      worker.emit("indexChanged");
    });
}

const handleEcho: WorkerRoutes["echo"] = async ({ req }) => ({ message: req.message });

const handleFullSync: WorkerRoutes["fullSync"] = async ({ req, emit }) => {
  const config = req.config;
  const db = getDb();
  const accessToken = await getAccessToken({ ...config, id_token: config.idToken });
  const proxy = getAuthenticatedProxy(accessToken);

  await clearAllNodes(await db);

  const summary = await search({
    proxy,
    filter: {
      entityTypes: [EntityType.Study],
      researcherIds: [835],
    },
    onProgress: async (progress) => {
      const graphNodes = searchResultDocumentToGraphNode(progress.items.map((item) => item.document));
      await putNode(await db, graphNodes);
      emit("syncProgressed", progress);
    },
  });

  const draftIndex = createFtsIndex();
  await exportNodes(await db, (exportNodeData) => draftIndex.add(graphNodeToFtsDocument(exportNodeData.node as HitsGraphNode)));
  activeIndex = draftIndex;
  emit("indexChanged");

  const exportedIndex = await exportFtsIndex(draftIndex);
  updateSyncRecord(await db, new Date(), exportedIndex);

  return summary;
};

const handleSearch: WorkerRoutes["search"] = async ({ req }) => {
  const results = (await activeIndex?.searchAsync(req.query)) ?? [];

  // TODO return highlighted html
  return {
    results,
  };
};

main();
