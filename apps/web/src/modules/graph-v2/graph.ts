import { isTruthy } from "../../utils/guard";
import type { GraphDB, NodeSchema } from "./db";
import { tx } from "./tx";

export const dump = (db: GraphDB) =>
  tx(db, ["node"], "readonly", async (tx) => {
    const nodes = await tx.objectStore("node").getAll();
    return {
      nodes,
    };
  });

export const put = (db: GraphDB, nodes: NodeSchema[]) =>
  tx(db, ["node"], "readwrite", async (tx) => {
    const nodeStore = tx.objectStore("node");
    nodes.map((node) => nodeStore.put(node));
  });

export const get = (db: GraphDB, ids: string[]) =>
  tx(db, ["node"], "readonly", async (tx) => {
    const nodeStore = tx.objectStore("node");
    const nodes = await Promise.all(ids.map((id) => nodeStore.get(id)));
    return nodes;
  });

export const mostRecentTimestamp = (db: GraphDB) =>
  tx(db, ["node"], "readonly", async (tx) => {
    const cursor = await tx.objectStore("node").index("byUpdatedOn").openCursor(null, "prev");
    return cursor?.key;
  });

export const clearAll = (db: GraphDB) => db.clear("node");

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
