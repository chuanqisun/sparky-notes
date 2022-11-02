/// <reference lib="WebWorker" />

import { getDb } from "./modules/graph-v2/db";
import { clearAll, put } from "./modules/graph-v2/graph";
import { searchResultDocumentToGraphNode } from "./modules/hits/adaptor";
import { getAccessToken } from "./modules/hits/auth";
import { EntityType } from "./modules/hits/entity";
import { getAuthenticatedProxy } from "./modules/hits/proxy";
import { search } from "./modules/hits/search";
import type { WorkerRoutes } from "./routes";
import { WorkerServer } from "./utils/worker-rpc";

declare const self: SharedWorkerGlobalScope | DedicatedWorkerGlobalScope;

async function main() {
  new WorkerServer<WorkerRoutes>(self).onRequest("echo", handleEcho).onRequest("sync", handleSync).start();
}

const handleEcho: WorkerRoutes["echo"] = async ({ req }) => ({ message: req.message });

const handleSync: WorkerRoutes["sync"] = async ({ req }) => {
  const config = req.config;
  const db = getDb();
  const accessToken = await getAccessToken({ ...config, id_token: config.idToken });
  const proxy = getAuthenticatedProxy(accessToken);

  await clearAll(await db);

  const summary = await search({
    proxy,
    filter: {
      entityTypes: [EntityType.Study],
      researcherIds: [835],
    },
    onProgress: async (progress) => {
      // TODO pipe through local indexer
      put(await db, searchResultDocumentToGraphNode(progress.items.map((item) => item.document)));
    },
  });
  return summary;
};

main();
