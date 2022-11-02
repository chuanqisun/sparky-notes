import type { RouteHandler } from "./utils/worker-rpc";

export type WorkerRoutes = {
  echo: RouteHandler<EchoReq, EchoRes>;
};

export interface EchoReq {
  message: string;
}
export interface EchoRes {
  message: string;
}
