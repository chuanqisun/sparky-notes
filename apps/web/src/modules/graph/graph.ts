import { isTruthy } from "../../utils/guard";
import type { GraphDB, NodeSchema } from "./db";
import { tx } from "./tx";

export interface ExportNodeData {
  node: NodeSchema;
  success: number;
  total: number;
}
export const exportNodes = (db: GraphDB, onData: (data: ExportNodeData) => any) =>
  tx(db, ["node"], "readonly", async (tx) => {
    const total = await tx.objectStore("node").count();
    let cursor = await tx.objectStore("node").openCursor();
    let success = 0;

    while (cursor) {
      onData({ node: cursor.value, total, success });
      cursor = await cursor.continue();
    }
  });

export const putNodes = <T extends NodeSchema>(db: GraphDB, nodes: T[]) =>
  tx(db, ["node"], "readwrite", async (tx) => {
    const nodeStore = tx.objectStore("node");
    nodes.map((node) => nodeStore.put(node));
  });

export const getNodes = <T extends NodeSchema>(db: GraphDB, ids: string[]) =>
  tx(db, ["node"], "readonly", async (tx) => {
    const nodeStore = tx.objectStore("node");
    const foundNodes: T[] = [];
    await Promise.all(
      ids.map(async (id) => {
        const node = await nodeStore.get(id);
        if (node) foundNodes.push(node as T);
      })
    );
    return foundNodes;
  });

export const updateSyncRecord = (db: GraphDB, syncedOn: Date, exportedIndex: any) =>
  tx(db, ["node", "syncRecord"], "readwrite", async (tx) => {
    const cursor = await tx.objectStore("node").index("byUpdatedOn").openCursor(null, "prev");
    const latestUpdatedOn = cursor?.key;
    if (!latestUpdatedOn) return; // noop

    tx.objectStore("syncRecord").clear();
    tx.objectStore("syncRecord").put({
      syncedOn,
      latestUpdatedOn,
      exportedIndex,
    });
  });

export const getLastSyncRecord = (db: GraphDB) => tx(db, ["syncRecord"], "readonly", async (tx) => (await tx.objectStore("syncRecord").getAll()).pop());

export const clearAllNodes = (db: GraphDB) => db.clear("node");

export const clearAllStores = (db: GraphDB) => {
  return tx(db, ["node", "syncRecord"], "readwrite", async (tx) => {
    tx.objectStore("syncRecord").clear();
    tx.objectStore("node").clear();
  });
};

export interface TreeNodeSchema extends NodeSchema {
  children?: TreeNodeSchema[];
}
export const getPriorityTree = (db: GraphDB, ids: string[]) =>
  tx(db, ["node"], "readonly", async (tx) => {
    const nodeStore = tx.objectStore("node");

    const nodes = (await Promise.all(ids.map((id) => nodeStore.get(id)))).filter(isTruthy);
    const results = new Map<string, TreeNodeSchema>();

    nodes.reduce((result, node) => {
      if (node.parentId) {
        // is a child node
        if (!result.has(node.parentId)) {
          // create parent, if none exist, and add self as first child.
          result.set(node.parentId, { children: [node] } as TreeNodeSchema);
        } else {
          // parent already exist, append to children array
          result.get(node.parentId)!.children!.push(node);
        }
      } else {
        // is a parent node
        if (!result.has(node.id)) {
          // parent node doesn't exist yet, create one
          result.set(node.id, { ...node, children: [] });
        } else {
          // fill out parent placeholder, if one already exists.
          Object.assign(result.get(node.id)!, node);
        }
      }
      return result;
    }, results);

    // List with parent nodes that could be placeholder
    // This happens when search matched query to a child node but not its parent node
    // JavaScript Map/Set preserves insertion order.
    const intermediateList = [...results.entries()];

    // ensure all parent node is hydrated
    const fullList = await Promise.all(
      intermediateList.map(async (parentNode) =>
        Promise.resolve(parentNode[1].updatedOn ? parentNode[1] : { ...(await nodeStore.get(parentNode[0])), ...parentNode[1] })
      )
    );

    return fullList;
  });
