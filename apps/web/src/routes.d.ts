import type { RouteHandler } from "./utils/worker-rpc";

export type WorkerRoutes = {
  echo: RouteHandler<EchoReq, EchoRes>;
  sync: RouteHandler<SyncReq, SyncRes>;
};

export interface EchoReq {
  message: string;
}
export interface EchoRes {
  message: string;
}

export interface SyncReq {}
