import type { HitsConfig } from "./modules/hits/config";
import type { RouteHandler } from "./utils/worker-rpc";

export type WorkerRoutes = {
  echo: RouteHandler<EchoReq, EchoRes>;
  sync: RouteHandler<SyncReq, any>;
};

export interface EchoReq {
  message: string;
}
export interface EchoRes {
  message: string;
}

export interface SyncReq {
  config: HitsConfig;
}
