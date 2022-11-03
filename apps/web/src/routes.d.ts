import type { HitsConfig } from "./modules/hits/config";
import type { HitsGraphNode } from "./modules/hits/hits";
import type { SearchProgress, SearchSummary } from "./modules/hits/search";
import type { RouteHandler } from "./utils/worker-rpc";

export type WorkerRoutes = {
  echo: RouteHandler<EchoReq, EchoRes>;
  incSync: RouteHandler<any, any>; // TBD
  fullSync: RouteHandler<FullSyncReq, SearchSummary, WorkerEvents>;
  search: RouteHandler<SearchReq, SearchRes>;
};

export type WorkerEvents = {
  syncProgressed: SearchProgress;
  indexChanged: undefined;
};

export interface EchoReq {
  message: string;
}
export interface EchoRes {
  message: string;
}

export interface FullSyncReq {
  config: HitsConfig;
}

export interface SearchReq {
  query: string;
}

export interface SearchRes {
  nodes: HitsGraphNode[];
}
