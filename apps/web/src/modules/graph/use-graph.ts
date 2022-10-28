import { useCallback, useRef, useState } from "preact/hooks";
import { isTruthy } from "../../utils/guard";
import { getGraphDB, NodeSchema } from "./db";
import { tx } from "./tx";

export interface TreeNodeSchema extends NodeSchema {
  children?: TreeNodeSchema[];
}

export function useGraph() {
  const [rev, setRev] = useState(0);

  const graphAsync = useRef(getGraphDB());

  const dump = useCallback(
    async () =>
      tx(await graphAsync.current, ["node"], "readonly", async (tx) => {
        const nodes = await tx.objectStore("node").getAll();
        return {
          nodes,
        };
      }),
    [rev]
  );

  const put = useCallback(async (nodes: NodeSchema[]) => {
    const result = await tx(await graphAsync.current, ["node"], "readwrite", async (tx) => {
      const nodeStore = tx.objectStore("node");
      nodes.map((node) => nodeStore.put(node));
    });

    setRev((prev) => prev + 1);
    return result;
  }, []);

  const get = useCallback(
    async (ids: string[]) =>
      tx(await graphAsync.current, ["node"], "readonly", async (tx) => {
        const nodeStore = tx.objectStore("node");
        const nodes = await Promise.all(ids.map((id) => nodeStore.get(id)));
        return nodes;
      }),
    [rev]
  );

  const mostRecentTimestamp = useCallback(
    async () =>
      tx(await graphAsync.current, ["node"], "readonly", async (tx) => {
        const cursor = await tx.objectStore("node").index("byUpdatedOn").openCursor(null, "prev");
        return cursor?.key;
      }),
    [rev]
  );

  /**
   * Convert list of ids to a list of tree nodes that satisfy the following:
   * All parent nodes will be immediately followed by either the child node that appears earliest in the input or another parent node, or is the last node in the result
   * All parent nodes will be sorted according to the appearance of either themselves or their earliest appearing child node in the input, whichever comes first
   * All child nodes will appear after its corresponding parent, even if the parent was not part of the input
   * All child nodes will appear in the same order as the input
   */
  const getPriorityTree = useCallback(
    async (ids: string[]) =>
      tx(await graphAsync.current, ["node"], "readonly", async (tx) => {
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
      }),
    [rev]
  );

  const clearAll = useCallback(async () => {
    (await graphAsync.current).clear("node");
  }, []);

  return {
    dump,
    clearAll,
    get,
    getPriorityTree,
    mostRecentTimestamp,
    put,
    rev,
  };
}
