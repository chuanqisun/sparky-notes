import { useCallback, useRef, useState } from "preact/hooks";
import { getGraphDB, NodeSchema } from "./db";
import { tx } from "./tx";

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

  const clearAll = useCallback(async () => {
    (await graphAsync.current).clear("node");
  }, []);

  return {
    dump,
    clearAll,
    get,
    put,
    rev,
  };
}
