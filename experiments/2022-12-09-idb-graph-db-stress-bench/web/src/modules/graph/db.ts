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
  nodeV2: {
    value: NodeSchemaV2;
    key: string;
    indexes: {
      byUpdatedOn: Date;
    };
  };
  edge: {
    value: EdgeSchema;
    key: number;
    indexes: {
      byFromId: string;
      byToId: string;
      byFromToIds: [string, string];
      byUpdatedOn: Date;
    };
  };
  syncRecord: {
    value: SyncRecordSchema;
    key: number;
  };
}

export interface NodeSchema {
  id: string;
  updatedOn: Date;
  [key: string]: any;
}

export interface NodeSchemaV2 {
  type: string;
  id: string;
  updatedOn: Date;
}

export interface EdgeSchema {
  id?: number;
  type: string;
  from: string;
  to: string;
  updatedOn: Date;
}

export interface SyncRecordSchema {
  latestUpdatedOn: Date;
  syncedOn: Date;
  exportedIndex: {
    config: any;
    dict: any;
  };
}

export type GraphDB = IDBPDatabase<GraphDBSchema>;

async function openAppDB(): Promise<GraphDB> {
  return openDB<GraphDBSchema>("hits-assistant-graph", 3, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      if (oldVersion < 1) {
        const nodeStore = db.createObjectStore("node", { keyPath: "id" });
        nodeStore.createIndex("byUpdatedOn", "updatedOn");
      }

      if (oldVersion < 2) {
        db.createObjectStore("syncRecord", { autoIncrement: true });
      }

      if (oldVersion < 3) {
        // clean up old data
        // transaction.objectStore("node").clear();
        // transaction.objectStore("syncRecord").clear();

        // set up new schema
        const nodeStoreV2 = db.createObjectStore("nodeV2", { keyPath: "id" });
        nodeStoreV2.createIndex("byUpdatedOn", "updatedOn");
        const edgeStore = db.createObjectStore("edge", { autoIncrement: true });
        edgeStore.createIndex("byFromId", "fromId");
        edgeStore.createIndex("byToId", "toId");
        edgeStore.createIndex("byFromToIds", "fromToIds");
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
