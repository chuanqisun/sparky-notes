import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface GraphDBSchema extends DBSchema {
  node: {
    value: NodeSchema;
    key: string;
    indexes: {
      byUpdatedOn: Date;
      byParentId: string;
    };
  };
}

export interface NodeSchema {
  id: string;
  parentId?: string;
  updatedOn: Date;
  [key: string]: any;
}

export type GraphDB = IDBPDatabase<GraphDBSchema>;

async function openAppDB(): Promise<GraphDB> {
  return openDB<GraphDBSchema>("hits-assistant-graph", 1, {
    upgrade(db, _oldVersion, _newVersion, _transaction) {
      const nodeStore = db.createObjectStore("node", { keyPath: "id" });
      nodeStore.createIndex("byUpdatedOn", "updatedOn");
      nodeStore.createIndex("byParentId", "parentId");
    },
    blocked() {
      // …
    },
    blocking() {
      // …
    },
    terminated() {
      // …
    },
  });
}
export const db = openAppDB();
