import type { PluginId } from "../../plugins/plugin-ids";

export interface PluginBase {
  id: number;
  displayName: string;
}

export interface Authenticatable {
  signIn: () => any;
  signOut: () => any;
}

export interface Configurable<ConfigType> {
  config: ConfigType;
  resetConfig: () => any;
  updateConfig: (config: ConfigType) => any;
}

export interface LinkSourceable<DataType> {
  toLinkSource: (node: DataType) => LinkSource;
}

export interface LinkTargetable {
  getIdFromUrl: (url: URL) => string | null;
}

export interface Searchable<DataType> {
  toSearchItem: (node: DataType) => SearchItem;
}

export interface Displayable<DataType> {
  toDisplayItem: (node: DataType) => DisplayItem;
}

export interface Syncable<DataType> {
  isConnected: boolean | undefined;
  pull: (nodes: PluginNode<DataType>[]) => Promise<Changeset<DataType>>;
}

export interface UrlImportable {
  parseUrl(url: URL): Promise<ImportableItem[]>;
}

export interface LinkSource {
  targets: Link[];
}
export interface Link {
  relation: string;
  url: string;
}

export interface ImportableItem {
  objectName: string;
  action: () => Promise<any>;
}

export interface SearchItem {
  keywords: string;
}

export interface DisplayItem {
  title: string;
  iconUrl?: string;
  thumbnailUrl?: string;
  externalUrl?: string;
}

export interface ConnectionStatus {
  name: "Connected" | "Disconnected" | "Pending";
}

export interface PluginNode<T = any> {
  id: string;
  dateUpdated: Date;
  // targetIds: string[];
  data: T;
  pluginId: PluginId; // TODO change to pluginId
}

export interface Changeset<T = any> {
  add: PluginNode<T>[];
  remove: PluginNode<T>[];
  update: PluginNode<T>[];
}
