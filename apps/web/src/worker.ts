/// <reference lib="WebWorker" />

import { getIndex } from "./modules/fts/fts";
import { getDb } from "./modules/graph-v2/db";
import { clearAll, put } from "./modules/graph-v2/graph";
import { graphNodeToFtsDocument, searchResultDocumentToGraphNode } from "./modules/hits/adaptor";
import { getAccessToken } from "./modules/hits/auth";
import { EntityType } from "./modules/hits/entity";
import { getAuthenticatedProxy } from "./modules/hits/proxy";
import { search } from "./modules/hits/search";
import type { WorkerEvents, WorkerRoutes } from "./routes";
import { WorkerServer } from "./utils/worker-rpc";

declare const self: SharedWorkerGlobalScope | DedicatedWorkerGlobalScope;

async function main() {
  const worker = new WorkerServer<WorkerRoutes, WorkerEvents>(self)
    .onRequest("echo", handleEcho)
    .onRequest("sync", handleSync)
    .onRequest("search", handleSearch)
    .start();
}

const handleEcho: WorkerRoutes["echo"] = async ({ req }) => ({ message: req.message });

const handleSync: WorkerRoutes["sync"] = async ({ req, emit }) => {
  const config = req.config;
  const db = getDb();
  const accessToken = await getAccessToken({ ...config, id_token: config.idToken });
  const proxy = getAuthenticatedProxy(accessToken);

  const index = getIndex();

  await clearAll(await db);

  const summary = await search({
    proxy,
    filter: {
      entityTypes: [EntityType.Study],
      researcherIds: [835],
    },
    onProgress: async (progress) => {
      const graphNodes = searchResultDocumentToGraphNode(progress.items.map((item) => item.document));
      await put(await db, graphNodes);
      graphNodes.map(graphNodeToFtsDocument).forEach((doc) => index.add(doc));
      emit("syncProgressed", progress);
    },
  });

  emit("indexChanged");

  return summary;
};

const handleSearch: WorkerRoutes["search"] = async ({ req }) => {
  const index = getIndex();

  const results = await index.searchAsync(req.query);

  // TODO return highlighted html
  return {
    results,
  };
};

main();
