import type { HitsConfig } from "./modules/hits/config";
import type { SearchProgress } from "./modules/hits/search";
import type { RouteHandler } from "./utils/worker-rpc";

export type WorkerRoutes = {
  echo: RouteHandler<EchoReq, EchoRes>;
  sync: RouteHandler<SyncReq, any, Pick<WorkerEvents, "syncProgress">>;
  search: RouteHandler<SearchReq, SearchRes>;
};

export type WorkerEvents = {
  syncProgress: SearchProgress;
  indexUpdated: undefined;
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

export interface SearchReq {
  query: string;
}

export interface SearchRes {
  results: any[];
}
