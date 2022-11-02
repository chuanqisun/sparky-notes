/// <reference lib="WebWorker" />

import { searchResultDocumentToGraphNode } from "./modules/hits/adaptor";
import { getAccessToken } from "./modules/hits/auth";
import { EntityTypes } from "./modules/hits/entity";
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
  const accessToken = await getAccessToken({ ...config, id_token: config.idToken });
  const proxy = getAuthenticatedProxy(accessToken);
  const summary = await search({
    proxy,
    filter: {
      entityTypes: [EntityTypes.Study],
      researcherIds: [835],
    },
    onProgress: (progress) => {
      const nodes = searchResultDocumentToGraphNode(progress.items.map((item) => item.document));
      console.log(nodes);
    },
  });
  // TODO pipe to graph and local indexer
  return summary;
};

main();
