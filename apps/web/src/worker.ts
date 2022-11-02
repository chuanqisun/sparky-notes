/// <reference lib="WebWorker" />

import type { WorkerRoutes } from "./routes";
import { WorkerServer } from "./utils/worker-rpc";

declare const self: SharedWorkerGlobalScope | DedicatedWorkerGlobalScope;

async function main() {
  new WorkerServer<WorkerRoutes>(self).onRequest("echo", async ({ req }) => ({ message: req.message })).start();
}

main();
