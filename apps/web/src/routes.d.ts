import type { HitsConfig } from "./modules/hits/config";
import type { HitsGraphNode } from "./modules/hits/hits";
import type { SearchProgress } from "./modules/hits/search";
import type { RouteHandler } from "./utils/worker-rpc";

export type WorkerRoutes = {
  echo: RouteHandler<EchoReq, EchoRes>;
  fullSync: RouteHandler<FullSyncReq, void, WorkerEvents>;
  incSync: RouteHandler<IncSyncReq, void, WorkerEvents>;
  search: RouteHandler<SearchReq, SearchRes>;
  uninstall: RouteHandler<undefined, void>;
};

export type WorkerEvents = {
  syncProgressed: SearchProgress;
  syncCompleted: FullSyncRes | IncSyncRes;
  indexChanged: "imported" | "updated";
  requestInstallation: undefined;
  uninstalled: undefined;
  installed: "success" | "failed";
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

export interface FullSyncRes {
  total: number;
  success: number;
  hasError: boolean;
}

export interface IncSyncReq {
  config: HitsConfig;
}

export interface IncSyncRes {
  total: number;
  success: number;
  hasError: boolean;
}

export interface SearchReq {
  query: string;
}

export interface SearchRes {
  nodes: HitsGraphNode[];
}
