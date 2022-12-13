import type { HitsFtsNode } from "./modules/fts/fts";
import type { HitsConfig } from "./modules/hits/config";
import type { SearchResultDocument } from "./modules/hits/hits";
import type { SearchProgress } from "./modules/hits/search";
import type { RouteHandler } from "./utils/worker-rpc";

export type WorkerRoutes = {
  echo: RouteHandler<EchoReq, EchoRes>;
  getCardData: RouteHandler<GetCardDataReq, GetCardDataRes>;
  search: RouteHandler<SearchReq, SearchRes>;
  recent: RouteHandler<RecentReq, RecentRes>;
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

export interface GetCardDataReq {
  config: HitsConfig;
  entityType: number;
  entityId: string;
}

export interface GetCardDataRes {
  cardData: SearchResultDocument | null;
}

export interface SearchReq {
  config: HitsConfig;
  query: string;
}

export interface SearchRes {
  nodes: HitsFtsNode[];
}

export interface RecentReq {
  config: HitsConfig;
}

export interface RecentRes {
  nodes: HitsFtsNode[];
}
