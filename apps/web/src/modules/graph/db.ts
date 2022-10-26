import { DBSchema, IDBPDatabase, openDB } from "idb";
import { once } from "../../utils/once";

export interface GraphDBSchema extends DBSchema {
  node: {
    value: NodeSchema;
    key: string;
    indexes: {
      byDateUpdated: Date;
    };
  };
  edge: {
    value: EdgeSchema;
    key: string;
    indexes: {
      byFrom: string;
      byTo: string;
      byFromTo: [string, string];
    };
  };
}

export interface NodeSchema {
  id: string;
  data: any;
  dateUpdated: Date;
}

export interface EdgeSchema {
  id?: number; // auto generated
  from: string;
  to: string;
  rel: string;
}

export type GraphDB = IDBPDatabase<GraphDBSchema>;

export async function openAppDB(): Promise<GraphDB> {
  return openDB<GraphDBSchema>("h20-graph", 1, {
    upgrade(db, _oldVersion, _newVersion, _transaction) {
      const nodeStore = db.createObjectStore("node", { keyPath: "id" });
      nodeStore.createIndex("byDateUpdated", "dateUpdated");

      const edgeStore = db.createObjectStore("edge", { keyPath: "id", autoIncrement: true });
      edgeStore.createIndex("byFrom", "from");
      edgeStore.createIndex("byTo", "to");
      edgeStore.createIndex("byFromTo", ["from", "to"]);
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

export const getGraphDB = once(openAppDB);
