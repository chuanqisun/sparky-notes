/// <reference lib="WebWorker" />

import { getAccessToken } from "./modules/hits/auth";
import { getHitsConfig } from "./modules/hits/config";
import { getAuthenticatedProxy } from "./modules/hits/proxy";
import { search } from "./modules/hits/search";
import type { WorkerRoutes } from "./routes";
import { WorkerServer } from "./utils/worker-rpc";

declare const self: SharedWorkerGlobalScope | DedicatedWorkerGlobalScope;

async function main() {
  new WorkerServer<WorkerRoutes>(self)
    .onRequest("echo", async ({ req }) => ({ message: req.message }))
    .onRequest("sync", async () => {
      const config = getHitsConfig();
      const accessToken = await getAccessToken({ ...config, id_token: config.idToken });
      const proxy = getAuthenticatedProxy(accessToken);
      const summary = await search({ proxy, filter: {}, onProgress: console.log });
      // TODO pipe to graph and local indexer
      return summary;
    })
    .start();
}

main();
