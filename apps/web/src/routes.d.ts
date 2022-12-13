import type { HitsFtsNode } from "./modules/fts/fts";
import type { HitsConfig } from "./modules/hits/config";
import type { SearchResultDocument } from "./modules/hits/hits";
import type { SearchProgress } from "./modules/hits/search";
import type { RouteHandler } from "./utils/worker-rpc";

export type WorkerRoutes = {
  echo: RouteHandler<EchoReq, EchoRes>;
  fullSync: RouteHandler<FullSyncReq, void, WorkerEvents>;
  getCardData: RouteHandler<GetCardDataReq, GetCardDataRes>;
  incSync: RouteHandler<IncSyncReq, void, WorkerEvents>;
  search: RouteHandler<SearchReq, SearchRes>;
  liveSearch: RouteHandler<LiveSearchReq, LiveSearchRes>;
  recent: RouteHandler<undefined, RecentRes>;
  uninstall: RouteHandler<undefined, void>;
};

export type WorkerEvents = {
  fullSyncProgressed: SearchProgress;
  syncFailed: undefined;
  incSyncProgressed: IncSyncProgress;
  indexChanged: "imported" | "builtFromIncSync" | "builtFromFullSync";
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

export interface GetCardDataReq {
  config: HitsConfig;
  entityType: number;
  entityId: string;
}

export interface GetCardDataRes {
  cardData: SearchResultDocument | null;
}

export interface IncSyncReq {
  config: HitsConfig;
}

export interface IncSyncProgress {
  existingTotal: number;
  existingIndexed: number;
  newTotal: number;
  newIndexed: number;
}
export interface LiveSearchReq {
  config: HitsConfig;
  query: string;
}

export interface LiveSearchRes {
  nodes: HitsFtsNode[];
}

export interface SearchReq {
  query: string;
}

export interface SearchRes {
  nodes: HitsFtsNode[];
}

export interface RecentRes {
  nodes: HitsFtsNode[];
}
