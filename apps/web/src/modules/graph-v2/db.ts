import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { once } from "../../utils/once";

export interface GraphDBSchema extends DBSchema {
  node: {
    value: NodeSchema;
    key: string;
    indexes: {
      byUpdatedOn: Date;
    };
  };
  syncRecord: {
    value: SyncRecordSchema;
    key: string;
  };
}

export interface NodeSchema {
  id: string;
  updatedOn: Date;
  [key: string]: any;
}

export interface SyncRecordSchema {
  latestUpdatedOn: Date;
  syncedOn: Date;
  exportedIndex: any;
}

export type GraphDB = IDBPDatabase<GraphDBSchema>;

async function openAppDB(): Promise<GraphDB> {
  return openDB<GraphDBSchema>("hits-assistant-graph", 2, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      if (oldVersion === 0) {
        const nodeStore = db.createObjectStore("node", { keyPath: "id" });
        nodeStore.createIndex("byUpdatedOn", "updatedOn");
      }

      if (oldVersion === 1) {
        transaction.objectStore("node").deleteIndex("byParentId");
        db.createObjectStore("syncRecord", { autoIncrement: true });
      }
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
export const getDb = once(openAppDB);
